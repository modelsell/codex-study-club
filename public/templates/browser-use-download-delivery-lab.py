"""Three Browser Use 1.0.8 integration comparisons.

Real fresh-local browser, REPL worker and loopback HTTP downloads; model responses,
success declarations and repair choice are scripted. Tested on macOS arm64, Python
3.12.14. No model/provider quality claim, Windows result, Cloud or user-profile test.
Run in a fresh virtual environment with the companion fixed requirements.
"""
import os, sys, json, hashlib, tempfile, threading, time, asyncio, csv, io, urllib.parse, importlib.metadata
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timezone


def launch_isolated():
 import argparse, subprocess, importlib.metadata
 parser=argparse.ArgumentParser(description='Browser Use 1.0.8: real local downloads with scripted model calls; no provider or Cloud browser.')
 parser.add_argument('--output',type=Path,default=Path('browser-download-results.json'))
 parser.add_argument('--browser-executable',help='Optional installed Chrome/Chromium/Edge executable; no installation is performed.')
 args=parser.parse_args()
 root=Path(tempfile.mkdtemp(prefix='cbu-',dir='/tmp' if os.name=='posix' and Path('/tmp').is_dir() else None));os.chmod(root,0o700)
 for name in ['tmp','runtime','bh','config','bh-tmp','agent','bu','guard','results']:(root/name).mkdir(mode=0o700)
 harness=Path(importlib.metadata.distribution('browser-harness').locate_file('browser_harness')).resolve()
 # Harness also reads these files itself; do not load an existing environment or helper module.
 for f in [harness.parent.parent/'.env',root/'agent/.env',root/'agent/agent_helpers.py']:
  if f.exists():raise RuntimeError('Environment/helper isolation check failed; use a fresh virtual environment.')
 flags={'ANONYMIZED_TELEMETRY':'false','BH_TELEMETRY':'0','BH_UPDATE_CHECK':'0','DO_NOT_TRACK':'1','BROWSER_USE_AUTO_LOGIN':'false','BROWSER_USE_NO_UPDATE_CHECK':'1','PYTHON_DOTENV_DISABLED':'1','BROWSER_USE_SETUP_LOGGING':'false','PYDANTIC_AI_NO_BANNER':'1','BROWSER_USE_CONFIG_DIR':str(root/'bu'),'CSC_LAB_ROOT':str(root)}
 guard="""import os,sys,json,ipaddress
"""+'os.environ.update('+repr(flags)+')\n'+"""def audit(event,args):
 if event not in ('socket.connect','socket.getaddrinfo'):return
 address=args[1] if event=='socket.connect' else args[0]
 if event=='socket.connect' and not isinstance(address,tuple):return
 host=address[0] if isinstance(address,tuple) else address
 if host in (None,'localhost','127.0.0.1','::1'):return
 try:allowed=ipaddress.ip_address(host).is_loopback
 except ValueError:allowed=False
 if not allowed:
  with open(os.environ['CSC_LAB_ROOT']+'/blocked-python-egress.jsonl','a') as f:f.write(json.dumps({'pid':os.getpid(),'event':event,'host':str(host)})+'\\n')
  raise RuntimeError('Non-loopback Python connection blocked')
sys.addaudithook(audit)
"""
 (root/'guard/sitecustomize.py').write_text(guard)
 # Preserve the real HOME without adding inherited credentials/proxy configuration.
 env={k:os.environ[k] for k in ['PATH','HOME','USER','LOGNAME','LANG','LC_ALL','SYSTEMROOT','WINDIR'] if k in os.environ}
 env.update(flags)
 env.update(TMPDIR=str(root/'tmp'),BH_HOME=str(root/'bh'),BH_CONFIG_DIR=str(root/'config'),BH_RUNTIME_DIR=str(root/'runtime'),BH_TMP_DIR=str(root/'bh-tmp'),BH_AGENT_WORKSPACE=str(root/'agent'),PYTHONPATH=str(root/'guard'),CSC_LAB_OUT=str(root/'results'))
 if args.browser_executable:env['CSC_BROWSER_EXECUTABLE']=args.browser_executable
 child=subprocess.run([sys.executable,str(Path(__file__).resolve()),'--worker'],cwd=root,env=env,capture_output=True,text=True,timeout=420)
 (root/'worker.stdout').write_text(child.stdout);(root/'worker.stderr').write_text(child.stderr)
 if child.returncode:raise RuntimeError(f'Integration checks failed; inspect private files in {root}')
 result=json.loads((root/'results/summary.json').read_text())
 blocked=root/'blocked-python-egress.jsonl';result['blocked_python_egress_attempts']=len(blocked.read_text().splitlines()) if blocked.exists() else 0
 result['network_scope']='Python audit guard only; not a claim about all Chrome background traffic.'
 result['cleanup']={f.stem:json.loads(f.read_text()) for f in (root/'results').glob('*-cleanup.json')}
 # Agent stops its owned endpoint immediately; this harness version may leave its daemon in a short shutdown grace.
 deadline=time.monotonic()+25
 while True:
  alive=[]
  for c in result['cleanup'].values():
   for label,x in c.items():
    try:os.kill(x['pid'],0);x['alive_after_grace']=True;alive.append(x['pid'])
    except ProcessLookupError:x['alive_after_grace']=False
  if not alive or time.monotonic()>=deadline:break
  time.sleep(0.2)
 assert all(not x['alive_after_grace'] for c in result['cleanup'].values() for x in c.values()),alive
 assert not result['blocked_python_egress_attempts']
 assert not any(f.is_socket() for f in (root/'runtime').rglob('*'))
 result['private_evidence_directory']=str(root)
 args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2))
 print(json.dumps({'cases':len(result['cases']),'output':str(args.output),'scope':result['scope']},ensure_ascii=False))

if __name__=='__main__' and '--worker' not in sys.argv:
 launch_isolated()
 raise SystemExit(0)

ROOT=Path(os.environ['CSC_LAB_ROOT']); OUT=Path(os.environ['CSC_LAB_OUT'])
VERSIONS={n:importlib.metadata.version(n) for n in ['browser-use','browser-harness','pydantic-ai-slim','pydantic']}
assert VERSIONS['browser-use']=='1.0.8'
from browser_use import Agent, Browser
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.messages import ModelResponse, ToolCallPart

CSV={'old':b'task_id,total\nprevious,7\n','current':b'task_id,total\ncurrent,42\n'}
HASH={k:hashlib.sha256(v).hexdigest() for k,v in CSV.items()}
HTTP=[]
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  route=urllib.parse.urlsplit(self.path).path
  HTTP.append({'route':route,'at':time.monotonic()})
  if route in ['/old','/current']:
   data=CSV[route[1:]]; self.send_response(200); self.send_header('Content-Type','text/csv; charset=utf-8');self.send_header('Content-Disposition','attachment; filename="report.csv"')
  elif route=='/':
   data=b'<!doctype html><title>Local CSV fixture</title><a id="old" href="/old">Old report</a><a id="current" href="/current">Current report</a>';self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8')
  else:data=b'not found';self.send_response(404)
  self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();BASE=f'http://127.0.0.1:{server.server_port}'

POLL="""
import time,json,hashlib,csv,io
from pathlib import Path
from urllib.parse import quote

def wait_for_count(n):
    until=time.monotonic()+12
    while time.monotonic()<until:
        found=downloads()
        pending=list(Path('downloads').glob('*.crdownload'))
        if len(found)>=n and not pending:
            return found
        time.sleep(0.1)
    raise RuntimeError('Download did not become complete in bounded wait')
"""

def serialize_messages(messages):
 records=[]
 for m in messages:
  for part in getattr(m,'parts',[]):
   kind=type(part).__name__
   if kind in ['ToolReturnPart','RetryPromptPart']:
    records.append({'kind':kind,'tool':getattr(part,'tool_name',None),'content':str(getattr(part,'content',''))[:14000]})
 return records

async def one(case):
 work=ROOT/case/'workspace';work.mkdir(parents=True)
 profile=ROOT/case/'profile'
 steps=[];pids={};identity={};agent=None
 duplicate=case!='single_current';will_repair=case=='encoded_current_then_stable'
 code1=POLL+f"\ngoto_url({BASE!r})\njs(\"document.querySelector('#{'old' if duplicate else 'current'}').click()\")\nprint(json.dumps({{'first':wait_for_count(1)}}))\n"
 code2="""
"""
 if duplicate:
  code2+=f"js(\"document.querySelector('#current').click()\")\nentries=wait_for_count(2)\n"
 else:code2+='entries=wait_for_count(1)\n'
 code2+="""
observed=[]
for entry in entries:
    p=Path('downloads')/entry['name']
    data=p.read_bytes()
    rows=list(csv.DictReader(io.StringIO(data.decode())))
    observed.append({'name':p.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'task_id':rows[0]['task_id']})
current=next(x for x in observed if x['task_id']=='current')
print(json.dumps({'observed':observed,'selected':current}))
"""
 if case=='duplicate_old_answer':code2+="chosen=next(x for x in observed if x['task_id']=='previous')\nanswer='[current](downloads/'+chosen['name']+')'\n"
 elif will_repair:code2+="answer='[current]('+quote('downloads/'+current['name'],safe='/')+')'\n"
 else:code2+="answer='[current](downloads/'+current['name']+')'\n"
 repair="""
source=Path('downloads')/current['name']
stable=Path('current-report.csv')
stable.write_bytes(source.read_bytes())
assert hashlib.sha256(stable.read_bytes()).hexdigest()==current['sha256']
answer='[current](current-report.csv)'
print(json.dumps({'stable_name':stable.name,'original':source.name,'sha256':current['sha256']}))
"""
 response_calls=[('python',{'code':code1}),('python',{'code':code2}),('finish_from_repl',{'expression':'answer','success':True})]
 if will_repair:response_calls += [('python',{'code':repair}),('finish_from_repl',{'expression':'answer','success':True})]
 def model(messages,info):
  nonlocal agent
  index=len(steps)
  if index>=len(response_calls):raise RuntimeError('Unexpected extra synthetic response')
  name,args=response_calls[index]
  if agent and agent._repl:
   proc=agent._repl.proc;pids['worker']=proc.pid if proc else None
  if agent and agent.browser._local and agent.browser._local.proc:pids['browser']=agent.browser._local.proc.pid
  if agent and agent.browser.name and 'daemon' not in pids:
   from browser_harness import _ipc as ipc
   identity['daemon_name']=agent.browser.name
   pids['daemon']=ipc.identify(agent.browser.name,timeout=5)
   assert pids['daemon'] is not None
   identity['browser_version']=agent.browser._cdp()('Browser.getVersion')
  steps.append({'index':index,'tool':name,'arguments':args,'model_input_tool_records':serialize_messages(messages)})
  return ModelResponse(parts=[ToolCallPart(name,args)])
 browser=Browser('chromium',headless=True,executable_path=os.environ.get('CSC_BROWSER_EXECUTABLE'),user_data_dir=profile,allowed_domains=['127.0.0.1'])
 agent=Agent('Download the current task CSV from the local fixture; final link must identify task_id=current and total=42.',llm=FunctionModel(model),browser=browser,workspace=work,judge=False,web_search=False,mode='default',use_vision=False,highlight_actions=False)
 before=len(HTTP);result=None
 try:
  result=await agent.run(max_steps=10,timeout=90)
  final=result.final_result()
  manifest=[]
  for f in sorted((work/'downloads').glob('*')):
   if f.is_file():
    data=f.read_bytes();manifest.append({'name':f.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
  expected='[current](current-report.csv)' if will_repair else '[current](downloads/report.csv)'
  assert final==expected,final
  href=final.split('](',1)[1][:-1]
  parsed=urllib.parse.urlsplit(href)
  assert not parsed.scheme and not parsed.netloc and not parsed.query and not parsed.fragment,href
  target=(work/urllib.parse.unquote(parsed.path)).resolve()
  assert target.is_relative_to(work.resolve()) and target.is_file(),href
  final_bytes=target.read_bytes()
  final_rows=list(csv.DictReader(io.StringIO(final_bytes.decode('utf-8'))))
  matches=hashlib.sha256(final_bytes).hexdigest()==HASH['current'] and final_rows==[{'task_id':'current','total':'42'}]
  retries=serialize_messages(result.messages)
  record={'case':case,'versions':VERSIONS,'status':result.status,'success':result.success,'final':final,'download_manifest':manifest,'result_downloads':[str(Path(f).relative_to(work)) for f in result.downloads],'final_target':str(target.relative_to(work.resolve())),'final_hash_matches_task':matches,'synthetic_response_count':len(steps),'tool_records':retries,'steps':steps,'pids':pids,'http':HTTP[before:],'browser_identity':identity,'final_rows':final_rows,'download_event_files':{str(f.relative_to(work)):f.read_text() for f in (work/'.browser-use').rglob('*downloads*') if f.is_file()}}
  (OUT/(case+'.json')).write_text(json.dumps(record,ensure_ascii=False,indent=2,default=str))
  assert result.status=='completed' and result.success is True,record
  assert matches==(case!='duplicate_old_answer'),record
  assert len(result.downloads)==(2 if duplicate else 1),record
  assert len(steps)==len(response_calls),record
  if will_repair:assert any(x['tool']=='finish_from_repl' and 'do not exist' in x['content'] and 'report%20%281%29.csv' in x['content'] for x in retries),retries
  return record
 finally:
  await agent.close()
  cleanup={}
  for label,pid in pids.items():
   if pid:
    try:os.kill(pid,0);alive=True
    except ProcessLookupError:alive=False
    cleanup[label]={'pid':pid,'alive_after_close':alive}
  (OUT/(case+'-cleanup.json')).write_text(json.dumps(cleanup,indent=2))

async def main():
 OUT.mkdir(parents=True,exist_ok=True)
 cases=[x for x in sys.argv[1:] if x!='--worker'] or ['single_current','duplicate_old_answer','encoded_current_then_stable']
 records=[]
 for case in cases:records.append(await one(case))
 summary={'checked_at':datetime.now(timezone.utc).isoformat(),'versions':VERSIONS,'cases':[{k:r[k] for k in ['case','status','success','synthetic_response_count','final_hash_matches_task','final_target','final_rows','result_downloads','browser_identity']} for r in records],'scope':'real top-level Agent/browser/worker/CDP and loopback HTTP; synthetic model calls/success/repair; no real model evaluation'}
 (OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2));print(json.dumps(summary,ensure_ascii=False))
try:asyncio.run(main())
finally:server.shutdown();server.server_close();thread.join(timeout=2)
