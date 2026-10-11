import { ALBUM_CUSTOMERS, ALBUM_SIZE, Album, albumKey, isPerfectMatch } from '../game/album';
import { PERSONAS } from '../game/mirror';

export function AlbumPanel({ album, onClose }: { album: Album; onClose(): void }) {
  const got = Object.keys(album).length;
  return (
    <div className="overlay" data-testid="album">
      <div className="panel album-panel">
        <div className="shop-head">
          <h2>📖 Album Gương Thần</h2>
          <button className="secondary-btn" onClick={onClose} data-testid="close-album">
            Đóng
          </button>
        </div>
        <p className="panel-note">
          Đã sưu tập <b data-testid="album-count">{got}</b>/{ALBUM_SIZE} trang. Ô có ★ là “hợp gu”: khách đó mê phong cách đó.
        </p>
        <div className="album-scroll">
          <table className="album-table">
            <thead>
              <tr>
                <th />
                {PERSONAS.map((p) => (
                  <th key={p.id} style={{ color: p.color }}>
                    {p.tag}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALBUM_CUSTOMERS.map((c) => (
                <tr key={c.id}>
                  <th>{c.name}</th>
                  {PERSONAS.map((p) => {
                    const e = album[albumKey(c.id, p.id)];
                    const star = isPerfectMatch(c.id, p.id);
                    return (
                      <td key={p.id} className={e ? 'got' : 'empty'} title={e ? `${e.styleName} — ${e.sat}%` : star ? 'Bí ẩn: khách này hợp gu phong cách này' : 'Chưa có'} data-cell={`${c.id}:${p.id}`}>
                        {e ? `${e.sat}%` : '???'}
                        {star && <span className="album-star">★</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
