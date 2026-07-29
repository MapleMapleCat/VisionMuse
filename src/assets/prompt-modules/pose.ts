import type { PromptModuleAssetDefinition } from './types'

export default {
  category: {
    key: 'pose',
    label: '动作',
    description: '短名称用于选择，实际组合时注入完整动作约束',
    selectionMode: 'single',
    maxSelections: 1,
  },
  modules: [
    {
      id: 'module-pose-standing',
      label: '站立',
      prompt: '人物保持自然站立姿态，身体重心稳定，肩颈放松，四肢位置符合真实人体结构',
      sortOrder: 10,
    },
    {
      id: 'module-pose-seated',
      label: '坐姿',
      prompt: '人物以自然坐姿呈现，躯干与座面关系明确，重心合理，手脚摆放放松且符合人体结构',
      sortOrder: 20,
    },
    {
      id: 'module-pose-walking',
      label: '行走',
      prompt: '捕捉人物正在自然行走的瞬间，前后脚步态清晰，手臂摆动与身体重心变化协调',
      sortOrder: 30,
    },
    {
      id: 'module-pose-running',
      label: '奔跑',
      prompt: '捕捉人物正在奔跑的动态瞬间，躯干前倾、四肢发力与衣物惯性共同体现速度感',
      sortOrder: 40,
    },
    {
      id: 'module-pose-turning',
      label: '自然回头',
      prompt: '人物在躯干朝向保持不变的前提下自然转动头部，颈部旋转连续，肩部不随头部过度扭转',
      sortOrder: 50,
    },
    {
      id: 'module-pose-kneeling',
      label: '跪姿',
      prompt: '人物以双膝或单膝触地形成跪姿，骨盆位于膝部上方，躯干重心稳定不过度扭转',
      sortOrder: 60,
    },
    {
      id: 'module-pose-squatting',
      label: '蹲姿',
      prompt: '人物屈膝下沉形成蹲姿，髋部降低，双脚接触支撑面，膝踝方向保持一致',
      sortOrder: 70,
    },
    {
      id: 'module-pose-supine',
      label: '仰卧',
      prompt: '人物背部贴近支撑面仰卧，头颈、脊柱与骨盆沿自然轴线展开，四肢无悬空错位',
      sortOrder: 80,
    },
    {
      id: 'module-pose-prone',
      label: '俯卧',
      prompt: '人物胸腹朝向支撑面俯卧，躯干获得连续支撑，肩部、骨盆与四肢接触关系合理',
      sortOrder: 90,
    },
    {
      id: 'module-pose-side-lying',
      label: '侧卧',
      prompt: '人物身体一侧贴近支撑面侧卧，肩髋上下对应，脊柱保持自然曲线，四肢避免交叠错位',
      sortOrder: 100,
    },
    {
      id: 'module-pose-jumping',
      label: '跃起',
      prompt: '捕捉人物双脚同时离开支撑面的跃起瞬间，膝髋发力明确，四肢惯性方向协调',
      sortOrder: 110,
    },
    {
      id: 'module-pose-one-leg-balance',
      label: '单脚站立',
      prompt: '人物以单脚承担主要体重，另一脚明确离地，骨盆与躯干围绕支撑脚保持平衡',
      sortOrder: 120,
    },
    {
      id: 'module-pose-tiptoe',
      label: '踮脚站立',
      prompt: '人物脚跟抬离支撑面以前脚掌承重，踝关节伸展，双腿与躯干维持稳定轴线',
      sortOrder: 130,
    },
    {
      id: 'module-pose-arms-crossed',
      label: '双臂交叉',
      prompt: '人物双臂在胸前自然交叉，左右前臂层次明确，手掌与肘部连接位置符合人体结构',
      sortOrder: 140,
    },
    {
      id: 'module-pose-hands-on-hips',
      label: '双手叉腰',
      prompt: '人物双手分别落在腰胯两侧，手指贴合身体，肘部向外展开且左右结构清楚',
      sortOrder: 150,
    },
    {
      id: 'module-pose-hands-behind-back',
      label: '双手背后',
      prompt: '人物双手置于身后自然交叠，肩部不过度后拉，手腕与手臂连接关系清楚可辨',
      sortOrder: 160,
    },
    {
      id: 'module-pose-reaching-forward',
      label: '向前伸手',
      prompt: '人物一侧手臂朝前方伸出，肩肘腕形成连续发力线，另一侧肢体不复制该动作',
      sortOrder: 170,
    },
    {
      id: 'module-pose-arm-raised',
      label: '单手高举',
      prompt: '人物一侧手臂向上举起，肘部自然伸展，手掌位于头顶上方且肩关节连接正确',
      sortOrder: 180,
    },
    {
      id: 'module-pose-curled-up',
      label: '蜷缩',
      prompt: '人物躯干前屈并收拢四肢形成蜷缩姿态，膝部靠近胸腹，颈背曲线连续自然',
      sortOrder: 190,
    },
    {
      id: 'module-pose-crawling',
      label: '四肢爬行',
      prompt: '人物以双手和双膝接触支撑面向前爬行，四点承重明确，脊柱与骨盆保持连贯',
      sortOrder: 200,
    },
  ],
} satisfies PromptModuleAssetDefinition
