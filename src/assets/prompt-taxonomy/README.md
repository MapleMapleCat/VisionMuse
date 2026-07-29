# 分级提示词 Taxonomy

本目录只定义选择结构，不重复保存提示词正文。每个可选择节点的 `id` 必须对应
`src/assets/prompt-modules` 中同 ID 的模块。

## 节点职责

- `PromptTaxonomyDomainDefinition`：页面一级导航领域。
- `PromptTaxonomyGroupDefinition`：一个独立选择轴，定义单选、多选和上限。
- `PromptTaxonomyChoiceDefinition`：真实可选择项，其 ID 同时是提示词模块 ID。
- `children`：只有父选项被选中后才出现的渐进子组。
- `visibleWhen`：控制组或选项是否属于当前分支。
- `enabledWhen`：选项可见但需要满足额外条件时使用。
- `excludes`：跨选择组冲突。选择服务会按双向互斥处理。

## 建模原则

1. 分级导航不等于语义从属。只有平台专属控制才挂在“固定机位”“人手持”或“无人机”下面。
2. 相机高度、仰俯角度、绕主体方位、焦段和景深是正交选择组。
3. 被摄人物姿态与摄影者持机姿势必须位于不同分支。
4. 纯导航组不输出 Prompt；被选中的语义节点才通过同 ID 模块输出精确长提示词。
5. 不创建自动搭配、完整场景配方或隐式补选。
