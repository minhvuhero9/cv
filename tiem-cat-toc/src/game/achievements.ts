/**
 * Thành tựu: long-term goals across the whole career. Each one unlocks a title (danh hiệu)
 * the player can hang under the shop sign, and a little experience for the shop.
 */
export interface AchievementStats {
  served: number;
  days: number;
  level: number;
  money: number;
  trophies: number;
  gold: number;
  stories: number;
  styles: number;
  freestyleLoved: number;
  catalogOrders: number;
  rooms: number;
  assistantJobs: number;
  walkouts: number;
  loved: number;
}

export interface Achievement {
  id: string;
  name: string;
  /** How to get it. */
  goal: string;
  /** The title it unlocks. */
  title: string;
  check(s: AchievementStats): boolean;
  /** Progress towards it (for the list). */
  progress(s: AchievementStats): [number, number];
}

const count = (key: keyof AchievementStats, n: number) => ({
  check: (s: AchievementStats) => s[key] >= n,
  progress: (s: AchievementStats): [number, number] => [Math.min(s[key], n), n],
});

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first10', name: 'Mười Cái Đầu Đầu Tiên', goal: 'Phục vụ 10 khách', title: 'Thợ Mới Vào Nghề', ...count('served', 10) },
  { id: 'served50', name: 'Kéo Không Nghỉ', goal: 'Phục vụ 50 khách', title: 'Tay Kéo Có Tiếng', ...count('served', 50) },
  { id: 'served150', name: 'Huyền Thoại Khu Phố', goal: 'Phục vụ 150 khách', title: 'Huyền Thoại Khu Phố', ...count('served', 150) },
  { id: 'loved20', name: 'Khách Mê Tít', goal: '20 khách “mê” kiểu tóc (từ 80%)', title: 'Thợ Được Yêu Nhất Phường', ...count('loved', 20) },
  { id: 'week', name: 'Trụ Được Một Tuần', goal: 'Mở tiệm 7 ngày', title: 'Chủ Tiệm Kiên Cường', ...count('days', 7) },
  { id: 'level5', name: 'Học Viện Bất Ổn', goal: 'Lên cấp tiệm 5', title: 'Hiệu Trưởng Học Viện', ...count('level', 5) },
  { id: 'rich', name: 'Két Đầy Ắp', goal: 'Có 2.000.000đ trong két', title: 'Đại Gia Phố Tóc', ...count('money', 2000000) },
  { id: 'cup1', name: 'Cúp Đầu Tay', goal: 'Đạt giải ở Cuộc thi tóc của phường', title: 'Thợ Có Giải', ...count('trophies', 1) },
  { id: 'gold3', name: 'Vua Cuộc Thi', goal: '3 Giải Nhất ở Cuộc thi tóc', title: 'Vua Cuộc Thi Tóc', ...count('gold', 3) },
  { id: 'story1', name: 'Người Kể Chuyện', goal: 'Đi trọn một câu chuyện của khách', title: 'Bạn Của Khách', ...count('stories', 1) },
  { id: 'story3', name: 'Ba Câu Chuyện Đẹp', goal: 'Đi trọn cả 3 câu chuyện', title: 'Người Giữ Ký Ức Phố', ...count('stories', 3) },
  { id: 'styles15', name: 'Nhà Sưu Tầm', goal: 'Tạo ra 15 kiểu tóc có tên', title: 'Nhà Sưu Tầm Kiểu Tóc', ...count('styles', 15) },
  { id: 'free5', name: 'Hiểu Gu Khách', goal: '5 khách tùy thợ hợp gu (từ 75%)', title: 'Thợ Đọc Vị', ...count('freestyleLoved', 5) },
  { id: 'catalog5', name: 'Cuốn Mẫu Đắt Hàng', goal: 'Khách đặt theo cuốn mẫu 5 lần', title: 'Nhà Thiết Kế Tóc', ...count('catalogOrders', 5) },
  { id: 'rooms', name: 'Tiệm Mở Rộng', goal: 'Mở 2 phòng mở rộng', title: 'Ông Chủ Chuỗi Tiệm', ...count('rooms', 2) },
  { id: 'teacher', name: 'Người Thầy', goal: 'Thợ phụ cắt 15 khách', title: 'Sư Phụ Bất Ổn', ...count('assistantJobs', 15) },
];

export const achievementById = (id: string | null | undefined) => ACHIEVEMENTS.find((a) => a.id === id) ?? null;

/** Newly reached achievements (not in `have`). */
export function newAchievements(s: AchievementStats, have: string[]): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !have.includes(a.id) && a.check(s));
}

export const ACHIEVEMENT_XP = 10;
