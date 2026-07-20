export type CaseCategory = {
  id: string;
  label: string;
  description: string;
};

export const caseCategories: CaseCategory[] = [
  { id: "getting-started", label: "新手入门", description: "第一次使用、写清任务与完成验证" },
  { id: "development", label: "开发与自动化", description: "工程排障、浏览器、CI 与发布流程" },
  { id: "content-design", label: "内容与设计", description: "演示、动画、图表与设计协作" },
  { id: "knowledge", label: "知识与协作", description: "知识库、团队数据与研究整理" },
  { id: "tools-devices", label: "工具与设备", description: "桌面扩展、移动协同与个性化" },
];

export function getCaseCategory(item: { category: string }) {
  return item.category;
}

export function getCaseCategoryLabel(categoryId: string) {
  return caseCategories.find((category) => category.id === categoryId)?.label || "实战案例";
}
