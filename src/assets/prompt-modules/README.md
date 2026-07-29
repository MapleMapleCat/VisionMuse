# 提示词模块与分级资源

`prompt-modules` 保存可写入最终提示词的精确语义片段，例如 `lens.ts`、`lighting.ts`、
`capture.ts` 和 `style.ts`。模块文件不再直接决定页面上的一级分类和互斥关系。

页面的分级制度位于相邻的 `prompt-taxonomy` 目录。Taxonomy 将模块组织为：

```text
领域 -> 选择组 -> 选项 -> 条件子组
```

- 领域负责导航，例如“媒介与拍摄”“相机与画面”。
- 选择组定义单选、多选和上限。
- 选项 ID 直接引用本目录中同 ID 的提示词模块。
- 选择带有子组的选项后，页面才显示对应下级控制。
- `visibleWhen`、`enabledWhen` 和 `excludes` 用于条件显示、前置条件和跨组互斥。

模块字段：

- `id`：稳定唯一标识。已有模块不要随意修改，否则会丢失对应的使用次数。
- `label`：界面选择器和已选轨道显示的短名称。
- `prompt`：拼接到最终提示词中的完整精确指令。
- `sortOrder`：模块在所属分类中的显示与拼接顺序。
- `selectionGroup`：旧平铺分类兼容字段。新界面的互斥和上限以 taxonomy 选择组为准。

分类字段仍用于 IndexedDB、备份兼容和使用次数统计。新增底层资源分类时，还需要同步更新：

1. `src/types.ts` 中的 `PROMPT_MODULE_CATEGORY_KEYS`。
2. 本目录 `index.ts` 中的资源导入与 `PROMPT_MODULE_ASSETS` 顺序。

应用通过 `index.ts` 将资源字段转换为兼容存储结构：`label` 对应 `title`，`prompt` 对应 `content`。

新增或修改模块时，还必须将其放入 `prompt-taxonomy` 中恰好一次。测试会验证：

1. 每个模块都有一个 taxonomy 选项。
2. Taxonomy 不重复引用模块。
3. 所有条件和互斥引用均指向真实选项。
4. 单选、多选上限和父子路径结构有效。
