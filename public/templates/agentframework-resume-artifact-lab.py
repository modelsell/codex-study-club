"""Agent Framework 1.26.0 offline checkpoint/argument experiment.
Run: python agentframework-resume-artifact-lab.py --output ./checkpoint-lab-output
The chat client is scripted. Local workflow, tool invocation and files are real.
No provider credentials, real model, human approval or remote business action.
"""
import argparse
import asyncio
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import socket
import subprocess
import sys
import tempfile

NETWORK_ATTEMPTS=[]
def deny_network(*args, **kwargs):
    NETWORK_ATTEMPTS.append('blocked')
    raise RuntimeError('NETWORK_DISABLED_FOR_OFFLINE_RESEARCH')
socket.socket.connect=deny_network
socket.socket.connect_ex=deny_network
socket.create_connection=deny_network
socket.getaddrinfo=deny_network

from agent_framework import (Agent, AgentResponse, BaseChatClient, ChatResponse, Content, Executor,
    FileCheckpointStorage, FunctionInvocationContext, FunctionInvocationLayer, Message,
    WorkflowBuilder, WorkflowContext, handler, response_handler, tool)

class ScriptedClient(FunctionInvocationLayer, BaseChatClient):
    def __init__(self):
        super().__init__(function_invocation_configuration={'max_iterations':3,'max_function_calls':1,'allow_concurrent_invocation':False})
        self.rounds=0
        self.saw_tool_error=False
    async def _inner_get_response(self, *, messages, stream, options, **kwargs):
        if stream:raise AssertionError('This probe is non-streaming only')
        self.rounds+=1
        results=[c for m in messages for c in m.contents if c.type=='function_result']
        if results:
            self.saw_tool_error=bool(results[-1].exception)
            text='SCRIPTED_TOOL_ERROR' if self.saw_tool_error else 'SCRIPTED_TOOL_COMPLETE'
            return ChatResponse(messages=[Message('assistant',[text])],finish_reason='stop')
        assert self.rounds==1,'Unexpected repeated synthetic tool request'
        return ChatResponse(messages=[Message('assistant',[Content.from_function_call('call-report-1','render_report',arguments={'report_id':'weekly-synthetic'})])],finish_reason='tool_calls')

class ReviewGate(Executor):
    @handler
    async def begin(self, message:str, ctx:WorkflowContext[Message,str])->None:
        await ctx.request_info('synthetic-review:'+message,bool,request_id='review-1')
    @response_handler
    async def resume(self, request:str,response:bool,ctx:WorkflowContext[Message,str])->None:
        if response is True:await ctx.send_message(Message('user',['Render the local synthetic report']))
        else:await ctx.yield_output('REJECTED_SYNTHETIC')

def make_workflow(root, case, gated):
    calls=[]
    client=ScriptedClient()
    @tool(approval_mode='never_require')
    def render_report(report_id:str,ctx:FunctionInvocationContext)->str:
        """Render a report from a runtime template revision; fixed synthetic data."""
        revision=ctx.kwargs.get('template_revision')
        calls.append({'report_id':report_id,'template_revision':revision})
        with (root/'tool-receipt.json').open('x',encoding='utf-8') as f:f.write(json.dumps(calls))
        if case=='tool_error':raise ValueError('SYNTHETIC_RENDER_FAILURE_BEFORE_ARTIFACT')
        if case.startswith('guard_') and revision!='v2':raise ValueError('SYNTHETIC_REVISION_MISMATCH')
        if revision not in ['v1','v2']:raise ValueError('Unknown synthetic revision')
        text=f'# Synthetic weekly report\n\nreport_id={report_id}\ntemplate_revision={revision}\nitems=3\n'
        raw=text.encode('utf-8')
        with (root/'report.md').open('xb') as f:f.write(raw)
        return json.dumps({'artifact':'report.md','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'template_revision':revision})
    schema=render_report.input_model.model_json_schema()
    assert set(schema.get('properties',{}))=={'report_id'},'Runtime context leaked into model-visible schema'
    agent=Agent(client=client,id='report-agent',name='ReportAgent',instructions='Synthetic transport research only',tools=[render_report])
    storage=FileCheckpointStorage(root/'checkpoints')
    if gated:
        gate=ReviewGate(id='review-gate');builder=WorkflowBuilder(start_executor=gate,checkpoint_storage=storage,name='synthetic-report-workflow-v1');builder.add_edge(gate,agent)
    else:builder=WorkflowBuilder(start_executor=agent,checkpoint_storage=storage,name='synthetic-fresh-report-v1')
    return builder.build(),storage,client

def options(revision):return {'function_invocation_kwargs':{'template_revision':revision}}

def describe(result, root, client):
    outs=[]
    for o in result.get_outputs():outs.append(o.text if isinstance(o,AgentResponse) else str(o))
    receipt=root/'tool-receipt.json';calls=json.loads(receipt.read_text()) if receipt.exists() else []
    f=root/'report.md';raw=f.read_bytes() if f.exists() else None
    return {'outputs':outs,'tool_calls':calls,'artifact':None if raw is None else {'name':'report.md','text':raw.decode(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()},'scripted_chat_rounds':client.rounds,'synthetic_tool_error_seen':client.saw_tool_error,'network_attempts':len(NETWORK_ATTEMPTS)}

async def worker(phase,case,root):
    marker=json.loads((root/'experiment-case.json').read_text(encoding='utf-8'))
    if marker!={'case':case,'experiment':'agentframework-resume-artifact-v1'}:raise ValueError('Not an owned experiment case')
    gated=case not in ['fresh_v2','guard_fresh']
    workflow,storage,client=make_workflow(root,case,gated)
    if phase=='seed':
        result=await workflow.run('weekly-report',**options('v1'))
        cp=await storage.get_latest(workflow_name=workflow.name)
        assert cp is not None and len(result.get_request_info_events())==1
        (root/'checkpoint-id.txt').write_text(cp.checkpoint_id)
        assert not (root/'report.md').exists() and not (root/'tool-receipt.json').exists() and client.rounds==0
        return {'paused_before_action':True,'checkpoint_count':len(await storage.list_checkpoints(workflow_name=workflow.name)),'network_attempts':len(NETWORK_ATTEMPTS)}
    if not gated:result=await workflow.run('Render the local synthetic report',**options('v2'))
    elif case=='same_instance_v2':
        await workflow.run('weekly-report',**options('v1'))
        assert not (root/'report.md').exists() and client.rounds==0
        result=await workflow.run(responses={'review-1':True},**options('v2'))
    else:
        overrides={} if case=='restore_omit' else options('v2')
        result=await workflow.run(checkpoint_id=(root/'checkpoint-id.txt').read_text(),responses={'review-1':case!='reject_restore'},**overrides)
    return describe(result,root,client)

def main(root):
    cases=['fresh_v2','same_instance_v2','restore_v2','restore_omit','reject_restore','tool_error','guard_restore','guard_fresh'];results=[]
    root.mkdir(parents=True,exist_ok=True)
    run_root=Path(tempfile.mkdtemp(prefix='artifact-run-',dir=root))
    env={'PATH':os.environ.get('PATH',''),'LC_ALL':'C','PYTHONHASHSEED':'0','OTEL_SDK_DISABLED':'true','PYTHONNOUSERSITE':'1'}
    for case in cases:
        case_dir=run_root/case;case_dir.mkdir()
        (case_dir/'experiment-case.json').write_text(json.dumps({'case':case,'experiment':'agentframework-resume-artifact-v1'}),encoding='utf-8')
        seed=None
        if case not in ['fresh_v2','same_instance_v2','guard_fresh']:
            r=subprocess.run([sys.executable,str(Path(__file__).resolve()),'_worker','seed',case,str(case_dir)],cwd=root,env=env,capture_output=True,text=True,timeout=30,check=True);seed=json.loads(r.stdout)
        r=subprocess.run([sys.executable,str(Path(__file__).resolve()),'_worker','run',case,str(case_dir)],cwd=root,env=env,capture_output=True,text=True,timeout=30)
        (case_dir/'worker-stderr.log').write_text(r.stderr)
        if r.returncode:raise RuntimeError(f'{case}: child exit {r.returncode}: '+r.stderr[-1800:])
        out=json.loads(r.stdout);assert out['network_attempts']==0
        if seed:assert seed['network_attempts']==0
        artifact=out['artifact'];calls=out['tool_calls']
        # Independently read the child's files in the parent; do not trust its result alone.
        receipt_file=case_dir/'tool-receipt.json'
        actual_calls=json.loads(receipt_file.read_text(encoding='utf-8')) if receipt_file.exists() else []
        assert actual_calls==calls,'Child receipt differs from the actual file'
        report_file=case_dir/'report.md'
        if artifact is None:assert not report_file.exists(),'Unexpected report after refusal or failure'
        else:
            actual_bytes=report_file.read_bytes()
            assert artifact=={'name':'report.md','text':actual_bytes.decode('utf-8'),'bytes':len(actual_bytes),'sha256':hashlib.sha256(actual_bytes).hexdigest()},'Child report differs from independent file readback'
        if case=='reject_restore':assert calls==[] and artifact is None and out['scripted_chat_rounds']==0 and out['outputs']==['REJECTED_SYNTHETIC']
        elif case in ['tool_error','guard_restore']:assert len(calls)==1 and calls[0]['template_revision']=='v1' and artifact is None and out['synthetic_tool_error_seen']
        else:
            revision='v1' if case in ['restore_v2','restore_omit'] else 'v2'
            assert len(calls)==1 and calls[0]['template_revision']==revision
            expected=f'# Synthetic weekly report\n\nreport_id=weekly-synthetic\ntemplate_revision={revision}\nitems=3\n'.encode()
            assert artifact and artifact['text'].encode()==expected and artifact['sha256']==hashlib.sha256(expected).hexdigest()
            assert out['outputs']==['SCRIPTED_TOOL_COMPLETE'] and not out['synthetic_tool_error_seen']
        if case=='restore_v2':out.update(caller_requested_revision='v2',actual_artifact_revision='v1',caller_override_honored=False)
        elif case in ['fresh_v2','same_instance_v2','guard_fresh']:out.update(caller_requested_revision='v2',actual_artifact_revision='v2',caller_override_honored=True)
        results.append({'case':case,'seed':seed,'result':out})
    assert not NETWORK_ATTEMPTS
    print(json.dumps({'sdk_version':importlib.metadata.version('agent-framework-core'),'python':platform.python_version(),'platform':platform.system(),'architecture':platform.machine(),'groups':len(results),'results':results,'parent_network_attempts':len(NETWORK_ATTEMPTS),'real_model_or_provider_requests':0,'external_business_actions':0,'artifact_directory':run_root.relative_to(root).as_posix(),'check_meaning':'Expected observations, including the override failure, were captured; not eight successful business tasks','scope':'Actual graph, AgentExecutor, Agent, SDK function loop and runtime context to local function; scripted chat responses and synthetic workflow-level Boolean review only. Not native tool approval or real model/client validation.'},ensure_ascii=False,indent=2))

if __name__=='__main__':
    if importlib.metadata.version('agent-framework-core')!='1.26.0':
        raise SystemExit('This experiment is pinned to agent-framework-core==1.26.0; use the supplied requirements in a separate venv.')
    if len(sys.argv)>1 and sys.argv[1]=='_worker':
        if len(sys.argv)!=5 or sys.argv[2] not in ['seed','run']:
            raise SystemExit('Invalid internal worker arguments')
        out=asyncio.run(worker(sys.argv[2],sys.argv[3],Path(sys.argv[4])))
        assert not NETWORK_ATTEMPTS
        print(json.dumps(out))
    else:
        parser=argparse.ArgumentParser(description='Offline checkpoint and real local-tool argument comparisons; no provider/model access.')
        parser.add_argument('--output',type=Path,default=Path('checkpoint-lab-output'),help='Parent for a new unique experiment directory; existing files are not overwritten.')
        args=parser.parse_args()
        main(args.output.resolve())
