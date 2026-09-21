import { parseAuditedSvg, SAFE_ALIASES, type AuditedNode } from './audited.js';
import {
  glyphDigest,
  parseGlyph,
  type ReviewedAnswer,
  type ReviewedGlyph
} from './puzzleGenerator.js';

// Required discoveries stay familiar even when the source character is uncommon.
const common = new Set([
  ...'一二三四五六七八九十百千万上下左右中大小月日年早木林森山川土王玉石田人口目耳手足心力男女子父母友火水金雨空花草竹糸貝虫犬鳥魚馬牛羊白黒赤青生先名字本休体見言語話読書聞思知意音楽明暗光星晴雪雲電春夏秋冬東西南北国園門間開閉家室学校文立正止走車刀弓矢米豆麦茶肉自至舌羽首高長多少古新公私分半全合今令命用同回向各有又士干工天夫太元兄可司召台吉安寺時村里重童章京景良食衣示祭交我義美善喜幸直真具缶'
]);
const paths = (node: AuditedNode): string[] => [...node.paths, ...node.children.flatMap(paths)];
const componentOnly = new Set([
  ...'丨丶丿乀乁乚亅亠冂冖冫凵勹匚匸卩厶夂夊宀巛廴廾彐彑彡攴攵疒癶禸罒耂虍襾覀辶阝龴龵龶龷龸龹龺儿厂广尸幺尢乂'
]);

export interface CampaignCandidate {
  glyph: ReviewedGlyph;
  strokes: number;
  rejected: { nodeId: string; character: string; reason: string }[];
}

export function deriveCampaignGlyph(
  file: string,
  svg: string,
  canonicalCounts: ReadonlyMap<string, number>
): CampaignCandidate {
  const { tree, kanji } = parseAuditedSvg(svg, file);
  const geometry = parseGlyph(kanji, svg);
  const answers = new Map<string, ReviewedAnswer>();
  const signatures = new Map<string, string>();
  const rejected: CampaignCandidate['rejected'] = [];
  function visit(node: AuditedNode): void {
    if (node !== tree && node.element) {
      const ids = paths(node).sort();
      let reason = '';
      if (
        !/^\p{Unified_Ideograph}$/u.test(node.element) ||
        componentOnly.has(node.element) ||
        Object.hasOwn(SAFE_ALIASES, node.element)
      )
        reason = 'not-independent-kanji';
      else if (node.partial || node.part !== undefined) reason = 'partial-or-split-group';
      else if (node.variant || (node.original && node.original !== node.element))
        reason = 'variant-form';
      else if (canonicalCounts.get(node.element) !== ids.length)
        reason = 'noncanonical-stroke-count';
      else if (!ids.length || ids.length >= geometry.strokes.length) reason = 'not-proper-subset';
      else if (signatures.has(ids.join('|')) && signatures.get(ids.join('|')) !== node.element)
        reason = 'ambiguous-stroke-set';
      if (reason) rejected.push({ nodeId: node.id, character: node.element, reason });
      else {
        signatures.set(ids.join('|'), node.element);
        const answer = answers.get(node.element) ?? {
          character: node.element,
          type: 'KANJI',
          variants: []
        };
        if (!answer.variants.some((variant) => variant.join('|') === ids.join('|')))
          answer.variants.push(ids);
        answers.set(node.element, answer);
      }
    }
    node.children.forEach(visit);
  }
  visit(tree);
  const ordered = [...answers.values()].sort(
    (a, b) => a.character.codePointAt(0)! - b.character.codePointAt(0)!
  );
  return {
    glyph: {
      character: kanji,
      svgFile: file,
      sha256: glyphDigest(svg),
      requiredAnswers: ordered.filter((answer) => common.has(answer.character)),
      bonusAnswers: ordered.filter((answer) => !common.has(answer.character))
    },
    strokes: geometry.strokes.length,
    rejected
  };
}

const featured = [...'鬱議響護鏡魔競識築藝警藤鶴驚機織麗霧露龍齋爵贈霜襲臨職觀鑑'];

export function selectCampaign(candidates: CampaignCandidate[], count = 500): CampaignCandidate[] {
  if (!Number.isInteger(count) || count < 1)
    throw new Error('Campaign count must be a positive integer');
  const eligible = candidates.filter(
    (entry) => entry.strokes >= 12 && entry.glyph.requiredAnswers.length >= 2
  );
  const rank = (entry: CampaignCandidate) => {
    const index = featured.indexOf(entry.glyph.character);
    return index < 0 ? featured.length : index;
  };
  eligible.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      b.glyph.requiredAnswers.length - a.glyph.requiredAnswers.length ||
      b.strokes - a.strokes ||
      a.glyph.character.codePointAt(0)! - b.glyph.character.codePointAt(0)!
  );
  const unique = [...new Map(eligible.map((entry) => [entry.glyph.character, entry])).values()];
  if (unique.length < count)
    throw new Error(`Only ${unique.length} eligible single-kanji puzzles; requested ${count}`);
  return unique.slice(0, count);
}
