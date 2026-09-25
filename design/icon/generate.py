"""
Génère les icônes de l'application web à partir de app-icon-source.png.

    uv run --with pillow --with numpy python design/icon/generate.py

- icon-192.png, icon-512.png : tuile arrondie d'origine, fond transparent (purpose "any")
- icon-maskable-512.png, apple-touch-icon.png : fond plein jusqu'aux bords, motif dans la zone sûre
- favicon-32.png, favicon-48.png : favicons
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).parent
OUT = HERE.parent.parent / "web" / "public" / "icons"
SAFE_RADIUS = 0.37  # rayon du motif / côté de l'icône (zone sûre maskable : 0.40)


def load_tile() -> Image.Image:
    src = Image.open(HERE / "app-icon-source.png").convert("RGBA")
    alpha = np.array(src.getchannel("A"))
    rgb = np.array(src)[..., :3].astype(int)
    dark = (alpha > 200) & (rgb.max(axis=2) < 70)
    ys, xs = np.nonzero(dark)
    tile = src.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    # La tuile source est très légèrement translucide : on la rend opaque.
    arr = np.array(tile)
    a = arr[..., 3].astype(float)
    arr[..., 3] = np.clip(a * 255 / 250, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def square_transparent(tile: Image.Image) -> Image.Image:
    side = max(tile.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(tile, ((side - tile.width) // 2, (side - tile.height) // 2), tile)
    return canvas


def full_bleed(tile: Image.Image, size: int) -> Image.Image:
    """Fond dégradé jusqu'aux bords, motif (cochon, pièce, ombre) recopié sans le bord de la tuile."""
    arr = np.array(tile).astype(float)
    h, w = arr.shape[:2]
    rgb, alpha = arr[..., :3], arr[..., 3]
    yy, xx = np.mgrid[0:h, 0:w]

    # Modèle du fond : plan de couleur ajusté sur l'intérieur de la tuile hors motif.
    luminance = rgb.mean(axis=2)
    inner = (alpha > 250) & (xx > w * 0.08) & (xx < w * 0.92) & (yy > h * 0.08) & (yy < h * 0.92)
    candidates = inner & (luminance < 60)
    design = np.column_stack([xx[candidates], yy[candidates], np.ones(candidates.sum())])
    coeffs = [np.linalg.lstsq(design, rgb[..., c][candidates], rcond=None)[0] for c in range(3)]

    def background(x: np.ndarray, y: np.ndarray) -> np.ndarray:
        return np.stack([k[0] * x + k[1] * y + k[2] for k in coeffs], axis=-1)

    # Masque du motif : les zones claires (cochon blanc, pièce dorée), dilatées puis adoucies
    # pour inclure leur ombre portée. Le reflet du haut de la tuile reste exclu.
    core = (luminance > 110) & inner
    mask = Image.fromarray((core * 255).astype(np.uint8))
    mask = mask.filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.GaussianBlur(18))
    m = np.array(mask).astype(float) / 255

    ys, xs = np.nonzero(core)
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    radius = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2).max()
    side = radius / SAFE_RADIUS

    # Canevas carré centré sur le motif, en coordonnées de la tuile.
    scale = side / size
    oy, ox = np.mgrid[0:size, 0:size]
    tx = cx - side / 2 + (ox + 0.5) * scale
    ty = cy - side / 2 + (oy + 0.5) * scale
    out = background(tx, ty)

    ix = np.clip(np.round(tx).astype(int), 0, w - 1)
    iy = np.clip(np.round(ty).astype(int), 0, h - 1)
    inside = (tx >= 0) & (tx < w) & (ty >= 0) & (ty < h)
    weight = np.where(inside, m[iy, ix], 0)[..., None]
    out = out * (1 - weight) + rgb[iy, ix] * weight

    # Échantillonnage au plus proche voisin : le rendu est calculé en grand puis réduit.
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    tile = load_tile()

    any_icon = square_transparent(tile)
    for s in (192, 512):
        any_icon.resize((s, s), Image.LANCZOS).save(OUT / f"icon-{s}.png", optimize=True)
    for s in (32, 48):
        any_icon.resize((s, s), Image.LANCZOS).save(OUT / f"favicon-{s}.png", optimize=True)

    big = full_bleed(tile, 2048)
    big.resize((512, 512), Image.LANCZOS).save(OUT / "icon-maskable-512.png", optimize=True)
    big.resize((180, 180), Image.LANCZOS).save(OUT / "apple-touch-icon.png", optimize=True)

    for f in sorted(OUT.iterdir()):
        print(f.name, Image.open(f).size)


if __name__ == "__main__":
    main()
