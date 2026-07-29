# 提示词模块资源

每个提示词维度使用一个独立资源文件，例如 `lens.ts`、`lighting.ts` 和 `style.ts`。

模块字段：

- `id`：稳定唯一标识。已有模块不要随意修改，否则会丢失对应的使用次数。
- `label`：界面选择器和已选轨道显示的短名称。
- `prompt`：拼接到最终提示词中的完整精确指令。
- `sortOrder`：模块在所属分类中的显示与拼接顺序。
- `selectionGroup`：可选。同一多选分类中，具有相同分组的模块互斥。

分类字段位于每个资源文件的 `category` 中。新增分类时，还需要同步更新：

1. `src/types.ts` 中的 `PROMPT_MODULE_CATEGORY_KEYS`。
2. 本目录 `index.ts` 中的资源导入与 `PROMPT_MODULE_ASSETS` 顺序。

应用通过 `index.ts` 将资源字段转换为兼容存储结构：`label` 对应 `title`，`prompt` 对应 `content`。
