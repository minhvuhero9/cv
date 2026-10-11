import type { RoundState } from './session';

export function cardFileName(s: RoundState) {
  const slug = s.result!.style.id;
  return `tiem-cat-toc-bat-on-${s.customer.id}-${slug}.png`;
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function shareText(s: RoundState) {
  const r = s.result!;
  return `Tôi vừa cắt cho ${s.customer.name} kiểu “${r.style.name}” (Chaos ${r.chaos}/100) ở Tiệm Cắt Tóc Bất Ổn. Bạn có dám cắt đẹp hơn không?`;
}
