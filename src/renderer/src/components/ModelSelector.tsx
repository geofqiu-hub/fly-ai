/**
 * 模型选择器组件
 * TODO: 实现模型选择UI
 */

interface Props {
    selectedModelId: string
    onSelectModel: (id: string) => void
}

export function ModelSelector({ selectedModelId, onSelectModel }: Props) {
    return (
        <div className="text-xs font-medium text-gray-500">
            {selectedModelId || 'No Model Selected'}
        </div>
    )
}
