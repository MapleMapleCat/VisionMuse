// 预置图库数据：约 40 条记录，覆盖不同尺寸/标签/收藏/日期
import type { GenParams, ImageRecord, PromptTemplate } from '@/types'
import type { ImageSize } from '@/types'
import { sizeToWH } from '@/types'
import { renderMockImage } from './mockImage'

interface SeedSpec {
  prompt: string
  size: ImageSize
  tags: string[]
  fav?: boolean
  daysAgo: number
  kind?: 'generate' | 'edit'
  n?: number
}

const SEEDS: SeedSpec[] = [
  { prompt: '一只在雨中打伞的橘猫，站在青石板路上，胶片摄影质感，浅景深', size: '1024x1536', tags: ['动物', '胶片'], fav: true, daysAgo: 0, n: 2 },
  { prompt: '赛博朋克夜市，霓虹灯牌写着「拉面」，蒸汽升腾，电影感构图', size: '1536x1024', tags: ['场景', '赛博朋克'], fav: true, daysAgo: 0, n: 2 },
  { prompt: '极简主义海报：一颗悬浮的红苹果，米色背景，柔和阴影', size: '1024x1024', tags: ['海报', '极简'], daysAgo: 0 },
  { prompt: '水彩风格的江南水乡，白墙黛瓦，小桥流水，清晨薄雾', size: '1536x1024', tags: ['风景', '水彩'], fav: true, daysAgo: 1, n: 2 },
  { prompt: '宇航员在月球表面放风筝，地球悬挂在黑色天空中，超现实主义', size: '1024x1024', tags: ['超现实'], daysAgo: 1 },
  { prompt: '日式庭院雪景，石灯笼上积着雪，一只红色锦鲤跃出温泉水面', size: '1024x1536', tags: ['风景', '日式'], daysAgo: 1 },
  { prompt: '蒸汽朋克风格的机械猫头鹰，黄铜齿轮外露，单色背景产品照', size: '1024x1024', tags: ['动物', '蒸汽朋克'], fav: true, daysAgo: 2 },
  { prompt: '深夜便利店窗口，暖黄灯光，雨滴在玻璃上，孤独城市情绪', size: '1024x1536', tags: ['场景', '情绪'], daysAgo: 2, n: 2 },
  { prompt: '一碗热气腾腾的兰州拉面特写，辣油红亮，香菜翠绿，美食摄影', size: '1536x1024', tags: ['美食'], daysAgo: 2 },
  { prompt: '低多边形风格的狐狸在雪林中，蓝紫色调，几何美学', size: '1024x1024', tags: ['动物', '低多边形'], daysAgo: 3 },
  { prompt: '敦煌飞天壁画风格的现代舞者，飘带环绕，金色与石青配色', size: '1024x1536', tags: ['人物', '国风'], fav: true, daysAgo: 3 },
  { prompt: '玻璃温室里的热带植物园，阳光透过雾气，龟背竹与蕨类', size: '1536x1024', tags: ['植物'], daysAgo: 3 },
  { prompt: '像素艺术风格的太空站内部，宇航员在喝咖啡，16-bit 复古游戏画面', size: '1024x1024', tags: ['像素', '游戏'], daysAgo: 4 },
  { prompt: '巨大的鲸鱼漂浮在云海之上，夕阳金光，梦幻史诗感', size: '1536x1024', tags: ['超现实', '风景'], fav: true, daysAgo: 4, n: 2 },
  { prompt: '中式茶室一角，紫砂壶与青瓷杯，木质纹理，侘寂美学', size: '1024x1024', tags: ['静物', '国风'], daysAgo: 5 },
  { prompt: '会发光的蘑菇森林，萤火虫飞舞，深夜童话插画风格', size: '1024x1536', tags: ['插画', '童话'], daysAgo: 5 },
  { prompt: '复古未来主义的火星殖民地海报，粗野主义建筑，橙红色沙丘', size: '1024x1536', tags: ['海报', '科幻'], daysAgo: 6 },
  { prompt: '一杯拿铁的拉花特写，天鹅图案，大理石桌面，早晨侧光', size: '1024x1024', tags: ['美食'], daysAgo: 6 },
  { prompt: '水墨画风格的黄山云海，孤松挺立，留白意境', size: '1536x1024', tags: ['风景', '国风', '水墨'], fav: true, daysAgo: 7 },
  { prompt: '机器人在图书馆里读书，暖色台灯，蒸汽朋克与温馨混搭', size: '1024x1024', tags: ['科幻', '情绪'], daysAgo: 7 },
  { prompt: '北欧极光下的玻璃小屋，雪原倒映绿色光带，长曝光摄影', size: '1536x1024', tags: ['风景', '摄影'], daysAgo: 8, n: 2 },
  { prompt: '折纸艺术风格的仙鹤群飞过金色稻田，纸张纹理清晰', size: '1536x1024', tags: ['折纸', '动物'], daysAgo: 9 },
  { prompt: '雨后的东京涩谷十字路口俯拍，透明雨伞人群，路面霓虹倒影', size: '1024x1024', tags: ['场景', '摄影'], daysAgo: 10 },
  { prompt: '一座漂浮在空中的岛屿城堡，瀑布从边缘落下，吉卜力风格', size: '1536x1024', tags: ['插画', '童话'], fav: true, daysAgo: 11 },
  { prompt: '黑白肖像：戴圆框眼镜的老钟表匠，专注神情，伦勃朗光', size: '1024x1536', tags: ['人物', '摄影'], daysAgo: 12 },
  { prompt: '果冻质感的透明小恐龙玩具，3D 渲染，糖果色，产品广告图', size: '1024x1024', tags: ['3D', '产品'], daysAgo: 13 },
  { prompt: '午夜天文台圆顶打开，望远镜指向银河，紫蓝色星空', size: '1024x1536', tags: ['风景', '科幻'], daysAgo: 14 },
  { prompt: '藤编篮子里的新鲜蔬菜，晨光下的农夫市集，油画笔触', size: '1536x1024', tags: ['静物', '油画'], daysAgo: 15 },
  { prompt: '一只戴着宇航头盔的柴犬，卡通贴纸风格，白色描边', size: '1024x1024', tags: ['动物', '贴纸'], daysAgo: 16 },
  { prompt: '苏州园林月洞门框景，一枝红梅探出，冬日午后', size: '1024x1536', tags: ['风景', '国风'], daysAgo: 17 },
  { prompt: '深海发光水母群，幽蓝深渊，国家地理摄影风格', size: '1536x1024', tags: ['动物', '摄影'], daysAgo: 18 },
  { prompt: '旧书店的旋转木楼梯，书堆到天花板，一束天窗光', size: '1024x1536', tags: ['场景', '情绪'], daysAgo: 19 },
  { prompt: '巧克力熔岩蛋糕切开的瞬间，金箔点缀，米其林摆盘', size: '1024x1024', tags: ['美食'], daysAgo: 20 },
  { prompt: '风暴海面上的灯塔，巨浪拍打，戏剧性光线，浪漫主义油画', size: '1024x1536', tags: ['风景', '油画'], daysAgo: 21 },
  { prompt: '孟菲斯风格的几何图案壁纸，撞色波点与波浪线', size: '1024x1024', tags: ['图案', '设计'], daysAgo: 22 },
  { prompt: '竹林中的大熊猫幼崽打滚，微距摄影，毛发细节', size: '1536x1024', tags: ['动物', '摄影'], daysAgo: 23 },
  { prompt: '午后阳台的三花猫睡在多肉植物旁，治愈系水彩插画', size: '1024x1024', tags: ['动物', '水彩'], daysAgo: 24 },
  { prompt: '香港九龙城寨风格的密集楼宇，招牌林立，霓虹雨夜', size: '1024x1536', tags: ['场景', '赛博朋克'], daysAgo: 25 },
  { prompt: '一列蒸汽火车穿过秋日枫叶峡谷，桥上白烟拖尾', size: '1536x1024', tags: ['风景', '摄影'], daysAgo: 26 },
  { prompt: '博物馆展柜里的机械心脏，齿轮与红宝石，聚光灯', size: '1024x1024', tags: ['蒸汽朋克', '静物'], daysAgo: 27 },
]

export const SEED_TEMPLATES: PromptTemplate[] = [
  { id: 'tpl-1', title: '电影感人像', content: '{{主体}}的电影感人像，{{光线}}，35mm 胶片质感，浅景深，柯达 Portra 400 色调', category: '摄影', useCount: 23 },
  { id: 'tpl-2', title: '国风水墨', content: '水墨画风格的{{主体}}，留白意境，淡墨渲染，宣纸纹理，落款印章', category: '国风', useCount: 18 },
  { id: 'tpl-3', title: '产品广告图', content: '{{产品}}的商业广告摄影，{{背景色}}纯色背景，柔和棚拍光，倒影地面，高级质感', category: '商业', useCount: 31 },
  { id: 'tpl-4', title: '吉卜力场景', content: '吉卜力动画风格的{{场景}}，手绘水彩质感，云朵蓬松，色彩温暖治愈', category: '插画', useCount: 42 },
  { id: 'tpl-5', title: '赛博朋克街景', content: '赛博朋克风格的{{地点}}，霓虹灯牌，雨夜反光路面，蒸汽，电影级打光，广角镜头', category: '科幻', useCount: 15 },
  { id: 'tpl-6', title: '等距小场景', content: '等距视角的迷你{{场景}}立体模型，3D 渲染，柔和环境光，粘土质感，细节丰富', category: '3D', useCount: 27 },
  { id: 'tpl-7', title: '美食特写', content: '{{食物}}的美食摄影特写，热气蒸腾，侧逆光，木质餐桌，景深虚化背景', category: '摄影', useCount: 19 },
  { id: 'tpl-8', title: '扁平插画', content: '{{主题}}的扁平风格插画，几何形状，明快撞色，噪点纹理，杂志封面构图', category: '插画', useCount: 12 },
]

const DEFAULT_PARAMS: GenParams = { size: '1024x1024', quality: 'medium', format: 'png', n: 1 }

/** 生成预置图库记录（同步，canvas 很快） */
export function buildSeedImages(): ImageRecord[] {
  const now = Date.now()
  const records: ImageRecord[] = []
  SEEDS.forEach((seed, si) => {
    const n = seed.n ?? 1
    const taskId = `seed-task-${si}`
    const createdAt = now - seed.daysAgo * 86400_000 - (si % 7) * 3600_000 - si * 60_000
    const { w, h } = sizeToWH(seed.size)
    for (let v = 0; v < n; v++) {
      records.push({
        id: `seed-img-${si}-${v}`,
        taskId,
        dataUrl: renderMockImage(seed.prompt, seed.size, v),
        width: w,
        height: h,
        prompt: seed.prompt,
        params: { ...DEFAULT_PARAMS, size: seed.size, n },
        kind: seed.kind ?? 'generate',
        favorite: seed.fav ?? false,
        tags: [...seed.tags],
        createdAt: createdAt + v * 1000,
      })
    }
  })
  return records
}
