import type { Quest } from '../types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const api = {
  // クエスト一覧取得
  async getQuests(): Promise<Quest[]> {
    const response = await fetch(`${BACKEND_URL}/quest`);
    if (!response.ok) {
      throw new Error('Failed to fetch quests');
    }
    return response.json();
  },

  // クエスト追加
  async createQuest(quest: Omit<Quest, 'id'>): Promise<Quest> {
    const response = await fetch(`${BACKEND_URL}/quest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quest),
    });
    if (!response.ok) {
      throw new Error('Failed to create quest');
    }
    return response.json();
  },

  // クエスト更新
  async updateQuest(id: number, quest: Partial<Quest>): Promise<Quest> {
    const response = await fetch(`${BACKEND_URL}/quest/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quest),
    });
    if (!response.ok) {
      throw new Error('Failed to update quest');
    }
    return response.json();
  },

  // クエスト削除
  async deleteQuest(id: number): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/quest/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete quest');
    }
  }
};
