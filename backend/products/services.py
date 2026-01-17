import os
import json
from groq import Groq
from duckduckgo_search import DDGS

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")


def generate_product_metadata(product: dict) -> dict:
    """
    Returns:
    {
      "meta_title": "...",
      "meta_description": "...",
      "excerpt": "...",
      "keywords": [...]
    }
    """

    prompt = f"""
Return ONLY valid JSON. No markdown. No extra text.

Generate:
- meta_title (max 60 chars)
- meta_description (max 160 chars)
- excerpt (short marketing line)
- keywords (array of 6-12 keywords)

Product:
{json.dumps(product, ensure_ascii=False)}
""".strip()

    res = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "You are an SEO assistant for an ecommerce inventory website."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.5,
        max_tokens=300,
    )

    text = res.choices[0].message.content.strip()
    text = text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(text)
    except Exception:
        # fallback so your pipeline never breaks
        return {
            "meta_title": product.get("product_name", "")[:60],
            "meta_description": f"Buy {product.get('brand_name','')} {product.get('product_name','')}".strip()[:160],
            "excerpt": f"{product.get('brand_name','')} {product.get('product_name','')}".strip(),
            "keywords": [],
            "_raw": text[:2000],
        }


def fetch_titles(query: str, limit: int = 15) -> list[str]:
    titles = []
    with DDGS() as ddgs:
        for r in ddgs.text(query, max_results=limit):
            t = (r.get("title") or "").strip()
            if t:
                titles.append(t)
    return titles[:limit]




def build_seo_name(product: dict, titles: list[str]) -> str:
    prompt = f"""
Generate ONE SEO-friendly product title (plain text only).
Use product data + search titles for inspiration.
Short, ecommerce-friendly.

Product:
{product}

Search Titles:
{titles}
"""
    res = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=80,
    )
    return (res.choices[0].message.content or "").strip()

