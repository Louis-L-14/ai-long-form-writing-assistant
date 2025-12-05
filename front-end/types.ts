export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'card_generation' | 'web_search';
  metadata?: any;
}

export interface Character {
  id: string;
  name: string;
  role: 'Protagonist' | 'Antagonist' | 'Supporting' | 'Mob';
  description: string;
  level?: string | number;
  affiliation?: string;
  status: 'Active' | 'Deceased' | 'Unknown';
  avatar?: string;
  // Wiki temporal data
  validFromChapter: number;
  validToChapter?: number;
  attributes: Record<string, string | number>;
}

export interface Chapter {
  id: string;
  title: string;
  number: number;
  status: 'published' | 'draft' | 'outline' | 'empty';
  summary?: string;
  outlinePoints?: OutlinePoint[];
  content?: string;
}

export interface OutlinePoint {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface Project {
  id: string;
  title: string;
  genre: string;
  description: string;
  targetAudience: string;
  currentChapter: number;
  totalWords: number;
}

export type ViewMode = 'genesis' | 'studio' | 'wiki';

export interface WikiEntity {
  id: string;
  type: 'Character' | 'Location' | 'Item';
  name: string;
  versions: WikiVersion[];
}

export interface WikiVersion {
  chapterStart: number;
  data: any; // Flexible data structure based on type
}

export interface OutlineVolume {
  id: string;
  title: string;
  summary?: string; // Detailed description (was description)
  detailed_outline?: string; // 卷细纲
  chapters: OutlineChapter[];
}

export interface OutlineChapter {
  id: string;
  title: string;
  summary?: string;
  detailed_outline?: string; // 章细纲
}

export interface ProjectMetaInfo {
  genre?: string;
  characters?: CharacterDetail[];  // Replaces protagonist and protagonist_details
  theme?: string; // 核心冲突
  power_system?: string;
  main_faction?: string;
  world_details?: any;
  outline?: OutlineVolume[];
}

export interface CharacterDetail {
  id: string;
  name: string;
  age?: string;
  personality?: string;
  appearance?: string;
  background?: string;
  relationships?: string;
  role: 'protagonist' | 'antagonist' | 'supporting';
  goal?: string;
  advantage?: string;
}