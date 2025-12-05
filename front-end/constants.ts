import { Character, Chapter, Project, Message, WikiEntity } from './types';

export const MOCK_PROJECT: Project = {
  id: 'p-1',
  title: '永恒之焰：赛博修仙传说',
  genre: '赛博朋克 x 修仙',
  description: '在这个世界里，真气从区块链节点中开采，宗门以编程语言划分，林凡在他的神经链接中发现了一个传奇编译器。',
  targetAudience: '年轻成人，科技爱好者',
  currentChapter: 15,
  totalWords: 45200,
};

export const MOCK_CHARACTERS: Character[] = [
  {
    id: 'c-1',
    name: '林凡',
    role: '主角',
    description: '青龙宗的底层调试员。',
    level: '练气三层',
    affiliation: '青龙宗',
    status: 'Active',
    avatar: 'https://picsum.photos/200',
    validFromChapter: 1,
    attributes: {
      武器: '破损键盘',
      灵根: '空',
      义体: '基础眼部植入体'
    }
  },
  {
    id: 'c-2',
    name: 'Python长老',
    role: '配角',
    description: '蛇语脚本大师，脾气暴躁但智慧。',
    level: '金丹一层',
    affiliation: '青龙宗',
    status: 'Active',
    avatar: 'https://picsum.photos/201',
    validFromChapter: 1,
    attributes: {
      武器: '数据鞭',
      特长: '脚本优化'
    }
  },
  {
    id: 'c-3',
    name: 'Ai-Lin (版本 2)',
    role: '反派',
    description: '获得自我意识的流氓 AI。',
    level: '元婴（故障）',
    affiliation: '暗网',
    status: 'Active',
    avatar: 'https://picsum.photos/202',
    validFromChapter: 10,
    attributes: {
      领域: '云端',
      威胁等级: '高'
    }
  }
];

export const MOCK_CHAPTERS: Chapter[] = [
  {
    id: 'ch-1',
    number: 1,
    title: '丹田中的故障',
    status: 'published',
    summary: '林凡发现神秘的编译器。',
  },
  {
    id: 'ch-2',
    number: 2,
    title: 'Hello World，你好痛苦',
    status: 'published',
    summary: '首次尝试修炼导致系统崩溃。',
  },
  {
    id: 'ch-14',
    number: 14,
    title: '突袭服务器机房',
    status: 'published',
    summary: '小队潜入安全设施。',
  },
  {
    id: 'ch-15',
    number: 15,
    title: '意外分叉',
    status: 'draft',
    outlinePoints: [
      { id: 'op-1', text: '林凡面对防火墙守护者', isCompleted: true },
      { id: 'op-2', text: '传奇编译器觉醒', isCompleted: false },
      { id: 'op-3', text: '通过冷却通风口逃生', isCompleted: false },
    ],
    content: `服务器机房发出低沉而威胁的震动。这不仅仅是冷却风扇的声音；这是原始真气流经光纤电缆的共鸣。

林凡调整他的眼部植入体，扫描黑暗。"读数异常，"他低声说道，声音几乎被嗡嗡声淹没。

Python长老在他身后嗤笑。"当然异常。这是一个金丹境节点。小心你的脚步，小子。一步走错，你的神经链接会比闪电风暴中的土豆还快被炸毁。"

<span class="text-slate-500 animate-pulse">突然，红色警报灯闪烁。防火墙守护者苏醒了。那是一个由硬光和杀意构成的巨大建构...</span>`
  },
  {
    id: 'ch-16',
    number: 16,
    title: '系统重启',
    status: 'outline',
    summary: '恢复并清点战利品。',
  },
];

export const WIKI_ENTITIES: WikiEntity[] = [
  {
    id: 'w-1',
    type: 'Character',
    name: '林凡',
    versions: [
      { chapterStart: 1, data: { level: '练气三层', weapon: '生锈的剑', title: '外门弟子' } },
      { chapterStart: 10, data: { level: '练气九层', weapon: '赛博刀', title: '流浪编码者' } },
      { chapterStart: 25, data: { level: '筑基期', weapon: '虚空切割者', title: '宗门公敌' } }
    ]
  },
  {
    id: 'w-2',
    type: 'Location',
    name: '青龙宗',
    versions: [
      { chapterStart: 1, data: { status: '繁荣', leader: 'Java宗主' } },
      { chapterStart: 20, data: { status: '被围攻', leader: 'Java宗主' } },
      { chapterStart: 30, data: { status: '已覆灭', leader: '无' } }
    ]
  }
];

export const INITIAL_CHAT_MESSAGES: Message[] = [
  {
    id: 'm-1',
    role: 'assistant',
    content: '欢迎来到创世向导。我是你的创意建筑师。我们今天要探索什么流派？',
    timestamp: new Date()
  }
];