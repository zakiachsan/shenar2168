import fs from 'fs';
import path from 'path';

const DISCUSSIONS_PATH = path.join(process.cwd(), 'data', 'discussions.json');

export interface Discussion {
  id: number;
  productId: number;
  question: string;
  askedBy: string;
  askedAt: string;
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  status: 'pending' | 'answered';
}

interface DiscussionsData {
  discussions: Discussion[];
}

function readDiscussions(): DiscussionsData {
  try {
    if (!fs.existsSync(DISCUSSIONS_PATH)) {
      return { discussions: [] };
    }
    const data = fs.readFileSync(DISCUSSIONS_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    return { discussions: Array.isArray(parsed.discussions) ? parsed.discussions : [] };
  } catch {
    return { discussions: [] };
  }
}

function writeDiscussions(data: DiscussionsData): void {
  const dir = path.dirname(DISCUSSIONS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DISCUSSIONS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function getDiscussions(productId?: number): Discussion[] {
  const data = readDiscussions();
  if (productId !== undefined) {
    return data.discussions
      .filter((d) => d.productId === productId)
      .sort((a, b) => new Date(b.askedAt).getTime() - new Date(a.askedAt).getTime());
  }
  return data.discussions.sort((a, b) => new Date(b.askedAt).getTime() - new Date(a.askedAt).getTime());
}

function getNextId(data: DiscussionsData): number {
  if (data.discussions.length === 0) return 1;
  return Math.max(...data.discussions.map((d) => d.id)) + 1;
}

export function addDiscussion(productId: number, question: string, askedBy: string): Discussion {
  const data = readDiscussions();
  const newDiscussion: Discussion = {
    id: getNextId(data),
    productId,
    question: question.trim(),
    askedBy: askedBy.trim(),
    askedAt: new Date().toISOString(),
    status: 'pending',
  };
  data.discussions.push(newDiscussion);
  writeDiscussions(data);
  return newDiscussion;
}

export function answerDiscussion(id: number, answer: string, answeredBy: string): Discussion | null {
  const data = readDiscussions();
  const index = data.discussions.findIndex((d) => d.id === id);
  if (index === -1) return null;
  data.discussions[index] = {
    ...data.discussions[index],
    answer: answer.trim(),
    answeredBy: answeredBy.trim(),
    answeredAt: new Date().toISOString(),
    status: 'answered',
  };
  writeDiscussions(data);
  return data.discussions[index];
}

export function deleteDiscussion(id: number): boolean {
  const data = readDiscussions();
  const initialLength = data.discussions.length;
  data.discussions = data.discussions.filter((d) => d.id !== id);
  if (data.discussions.length === initialLength) return false;
  writeDiscussions(data);
  return true;
}
