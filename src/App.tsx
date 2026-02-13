import { useState, useEffect, useCallback } from "react";
import "./RecipeNutritionist.css";

const API_BASE = "https://www.themealdb.com/api/json/v1/1";

const SUGGESTIONS = ["Chicken","Salmon","Beef","Pork","Eggs","Potatoes","Onions","Tofu"];
const GOALS = ["Weight Loss","Muscle Gain","Balanced Diet","Low Carb","High Protein","Vegetarian"];

interface Ingredient {
  name: string;
  measure: string;
}

interface Meal {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strMealThumb: string;
  strInstructions: string;
  strYoutube: string;
  [key: string]: string;
}

function getIngredients(meal: Meal): Ingredient[] {
  const out: Ingredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const meas = meal[`strMeasure${i}`];
    if (ing?.trim()) out.push({ name: ing.trim(), measure: meas?.trim() || "" });
  }
  return out;
}

// ── RECIPE CARD ──
interface RecipeCardProps {
  meal: Meal;
  onClick: (meal: Meal) => void;
}

function RecipeCard({ meal, onClick }: RecipeCardProps) {
  return (
    <div className="recipe-card" onClick={() => onClick(meal)}>
      <div className="card-img-wrap">
        <img className="card-img" src={meal.strMealThumb} alt={meal.strMeal} loading="lazy" />
        {meal.strCategory && <span className="card-badge">{meal.strCategory}</span>}
      </div>
      <div className="card-body">
        {meal.strArea && <div className="card-area">{meal.strArea}</div>}
        <div className="card-name">{meal.strMeal}</div>
        <span className="card-cta">View Recipe <span className="arrow">→</span></span>
      </div>
    </div>
  );
}

// ── RECIPE MODAL ──
interface RecipeModalProps {
  meal: Meal;
  onClose: () => void;
  apiKey: string;
}

function RecipeModal({ meal, onClose, apiKey }: RecipeModalProps) {
  const [analysis, setAnalysis] = useState<string>("");
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const ingredients = getIngredients(meal);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [onClose]);

  const analyze = async () => {
    if (!apiKey) return;
    setAnalyzing(true);
    setAnalysis("");
    const ingList = ingredients.map(i => `${i.measure} ${i.name}`).join(", ");
    const prompt = `You are a professional nutritionist. Analyze this recipe:\n\nRecipe: ${meal.strMeal}\nCategory: ${meal.strCategory || "Unknown"} | Cuisine: ${meal.strArea || "Unknown"}\nIngredients: ${ingList}\n\nPlease provide:\n1. Estimated calories per serving (assume 4 servings)\n2. Macronutrient breakdown (protein, carbs, fat) per serving\n3. Key vitamins & minerals present\n4. Health benefits of this dish\n5. Who this recipe is ideal for (e.g., weight loss, athletes, etc.)\n6. One simple tip to make it even healthier\n\nKeep your response clear, practical, and encouraging. Use plain text with no markdown symbols.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You are a warm, knowledgeable nutritionist. Provide concise, practical nutritional analysis. Never use asterisks, hashtags, or markdown. Use plain numbered lists and clear paragraphs.",
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      setAnalysis(data.content?.[0]?.text || "Could not retrieve analysis.");
    } catch {
      setAnalysis("Something went wrong. Please check your API key and try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="close-btn" onClick={onClose}>×</button>
        <div className="modal-img-wrap">
          <img className="modal-img" src={meal.strMealThumb} alt={meal.strMeal} />
          <div className="modal-img-overlay" />
          <div className="modal-img-text">
            <div className="modal-tags">
              {meal.strCategory && <span className="modal-tag tag-cat">{meal.strCategory}</span>}
              {meal.strArea && <span className="modal-tag tag-area">{meal.strArea}</span>}
            </div>
            <h2 className="modal-title">{meal.strMeal}</h2>
          </div>
        </div>
        <div className="modal-body">
          <div>
            <div className="modal-section-label">Ingredients</div>
            <ul className="ing-list">
              {ingredients.map((ing, i) => (
                <li key={i} className="ing-item">
                  <span className="ing-name">{ing.name}</span>
                  <span className="ing-measure">{ing.measure}</span>
                </li>
              ))}
            </ul>

            {/* Nutrition Analysis Button */}
            <div style={{ marginTop: 24 }}>
              <div className="modal-section-label">AI Nutrition Analysis</div>
              {!analysis && !analyzing && (
                <button className="analyze-btn" onClick={analyze} disabled={!apiKey}>
                  🥦 {apiKey ? "Analyze Nutrition" : "Add API key to analyze"}
                </button>
              )}
              {analyzing && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, color: "var(--green)", fontSize: 13 }}>
                  <div className="dots"><div className="dot"/><div className="dot"/><div className="dot"/></div>
                  <span>Analyzing nutrition...</span>
                </div>
              )}
              {analysis && (
                <div className="analysis-panel">
                  <div className="analysis-label">🥗 Nutritionist''s Notes</div>
                  <p className="analysis-text">{analysis}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="modal-section-label">Instructions</div>
            <p className="instructions-text">{meal.strInstructions}</p>
            {meal.strYoutube && (
              <a className="yt-btn" href={meal.strYoutube} target="_blank" rel="noreferrer">▶ Watch on YouTube</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NUTRITIONIST TAB ──
interface NutritionistTabProps {
    apiKey: string;
}
function NutritionistTab({ apiKey }: NutritionistTabProps) {
  const [ingredients, setIngredients] = useState<string>("");
  const [calories, setCalories] = useState<string>("");
  const [goal, setGoal] = useState<string>("Balanced Diet");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string | null>(null);

  const submit = async () => {
    if (!ingredients.trim() || !apiKey) return;
    setLoading(true);
    setResult(null);

    const calorieNote = calories ? `Target calories per meal: ${calories} kcal.` : "No specific calorie target.";
    const prompt = `You are a professional nutritionist and creative chef. A client has come to you with the following:\n\nAvailable ingredients: ${ingredients}\n${calorieNote}\nDietary goal: ${goal}\n${notes ? `Additional notes: ${notes}` : ""}\n\nPlease provide:\n\nRECIPE SUGGESTIONS\nSuggest 2-3 creative, delicious recipes they can make with these ingredients. For each recipe give a name, brief description (1-2 sentences), estimated calories per serving, and whether it fits their goal.\n\nNUTRITIONAL OVERVIEW\nBriefly explain the nutritional strengths and any gaps in their ingredient list.\n\nGOAL ALIGNMENT\nExplain how your suggestions support their ${goal} goal with 2-3 specific tips.\n\nSMART SUBSTITUTIONS\nSuggest 2-3 ingredient swaps or additions that would improve their nutrition.\n\nUse clear sections with the headings above. Write in plain text only — no asterisks, dashes, or markdown symbols. Be warm, encouraging, and specific.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          system: "You are a warm, expert nutritionist and creative chef. Give practical, personalized advice. Never use asterisks, hashtags, bullet dashes, or markdown. Use clear plain-text paragraphs and the section headings provided.",
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      setResult(data.content?.[0]?.text || "No response received.");
    } catch {
      setResult("Something went wrong. Please check your API key and try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatResult = (text: string) => {
    if (!text) return null;
    const sections = ["RECIPE SUGGESTIONS","NUTRITIONAL OVERVIEW","GOAL ALIGNMENT","SMART SUBSTITUTIONS"];
    const icons: {[key: string]: string} = { "RECIPE SUGGESTIONS":"🍽", "NUTRITIONAL OVERVIEW":"📊", "GOAL ALIGNMENT":"🎯", "SMART SUBSTITUTIONS":"🔄" };
    const parts: {title: string, icon: string, content: string}[] = [];
    let remaining = text;

    sections.forEach((section, idx) => {
      const nextSection = sections[idx + 1];
      const start = remaining.indexOf(section);
      if (start === -1) return;
      const end = nextSection ? remaining.indexOf(nextSection) : remaining.length;
      const content = remaining.slice(start + section.length, end > -1 ? end : undefined).trim();
      parts.push({ title: section, icon: icons[section], content });
    });

    if (parts.length === 0) return <div className="ai-text">{text}</div>;

    return parts.map((p, i) => (
      <div key={i} className="ai-card" style={{ animationDelay: `${i * 0.1}s` }}>
        <div className="ai-card-header">
          <span className="ai-icon">{p.icon}</span>
          <span className="ai-card-title">{p.title.charAt(0) + p.title.slice(1).toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</span>
        </div>
        <div className="ai-card-body">
          <p className="ai-text">{p.content}</p>
        </div>
      </div>
    ));
  };

  return (
    <div className="nutri-layout">
      <div className="nutri-form-card">
        <div className="form-section-label">Your Ingredients & Goals</div>

        <div className="form-group">
          <label className="form-label">Ingredients you have</label>
          <textarea
            className="form-textarea"
            placeholder="e.g. chicken, rice, onions... (comma-separated)"
            value={ingredients}
            onChange={e => setIngredients(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Target calories per meal</label>
          <div className="calorie-row">
            <input
              className="calorie-input"
              type="number"
              placeholder="e.g. 500"
              value={calories}
              onChange={e => setCalories(e.target.value)}
              min="100" max="3000"
            />
            <span className="calorie-unit">kcal / serving</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Dietary goal</label>
          <div className="goal-row">
            {GOALS.map(g => (
              <button key={g} className={`goal-btn ${goal === g ? "active" : ""}`} onClick={() => setGoal(g)}>{g}</button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Any other notes? (optional)</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: 70 }}
            placeholder="e.g. I'm lactose intolerant, prefer spicy food, cooking for 2..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <button className="submit-btn" onClick={submit} disabled={loading || !ingredients.trim() || !apiKey}>
          {loading ? "Consulting nutritionist…" : "Get My Recipe Plan"}
        </button>

        <div className="api-key-note">
          ℹ️ This feature uses the Claude AI API. Enter your free Anthropic API key below. Get one at console.anthropic.com
        </div>
      </div>

      <div className="ai-panel">
        {!result && !loading && (
          <div className="state">
            <span className="state-icon">🥗</span>
            <div className="state-title">Your personal nutritionist</div>
            <p className="state-sub">Enter your ingredients (comma-separated) and goal, and get AI-powered recipe suggestions tailored to your calorie target.</p>
          </div>
        )}
        {loading && (
          <div className="state">
            <span className="state-icon">🤔</span>
            <div className="state-title">Your nutritionist is thinking…</div>
            <div className="dots"><div className="dot"/><div className="dot"/><div className="dot"/></div>
          </div>
        )}
        {result && !loading && formatResult(result)}
      </div>
    </div>
  );
}

// ── MAIN APP ──
export default function App() {
  const [tab, setTab] = useState<"search" | "nutri">("search");
  const [query, setQuery] = useState<string>("");
  const [omitQuery, setOmitQuery] = useState<string>("");
  const [results, setResults] = useState<Meal[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);

  const searchRecipes = useCallback(async (term: string, omit: string) => {
    if (!term.trim()) return;
    setLoading(true);
    setSearched(true);
    setResults([]);

    const searchIngredients = term.split(",").map(item => item.trim().toLowerCase()).filter(Boolean);
    const ingredientsToOmit = omit.split(",").map(item => item.trim().toLowerCase()).filter(Boolean);

    try {
      const mealListsPromises = searchIngredients.map(ingredient =>
        fetch(`${API_BASE}/filter.php?i=${encodeURIComponent(ingredient)}`).then(res => res.json())
      );
      const mealListsResponses = await Promise.all(mealListsPromises);

      if (mealListsResponses.some(response => !response.meals)) {
        setResults([]);
        setLoading(false);
        return;
      }

      const mealIdSets = mealListsResponses.map(response => new Set(response.meals.map((meal: { idMeal: string }) => meal.idMeal)));

      const intersection = mealIdSets.reduce((acc, currentSet) => {
        return new Set([...acc].filter(id => currentSet.has(id)));
      });

      const commonMealIds = [...intersection];

      if (commonMealIds.length > 0) {
        const mealDetailsPromises = commonMealIds.map((id: string) =>
          fetch(`${API_BASE}/lookup.php?i=${id}`).then(res => res.json())
        );
        const mealDetailsResponses = await Promise.all(mealDetailsPromises);
        const fullMeals = mealDetailsResponses.map(response => response.meals[0]).filter(Boolean);

        const filteredMeals = fullMeals.filter(meal => {
          const mealIngredients = getIngredients(meal).map(ing => ing.name.toLowerCase());
          return !ingredientsToOmit.some(omitIng => mealIngredients.includes(omitIng));
        });

        setResults(filteredMeals);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    searchRecipes(query, omitQuery);
  };

  return (
    <>
      <div className="app">
        <header className="header">
          <div className="logo">Mise <em>en</em> Place</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="header-pills">
              <button className={`pill ${tab === "search" ? "pill-active" : "pill-inactive"}`} onClick={() => setTab("search")}>Recipe Search</button>
              <button className={`pill ${tab === "nutri" ? "pill-active" : "pill-inactive"}`} onClick={() => setTab("nutri")}>AI Nutritionist</button>
            </div>
            <button
              onClick={() => setShowKeyInput(v => !v)}
              style={{ background:"transparent", border:"1px solid #2a2018", color: apiKey ? "#6db88a" : "#6a5a48", borderRadius: 4, padding:"6px 12px", cursor:"pointer", fontSize: 11, letterSpacing:"1px", fontFamily:"'Jost',sans-serif", fontWeight:500 }}
            >
              {apiKey ? "✓ API Key" : "API Key"}
            </button>
          </div>
        </header>

        {showKeyInput && (
          <div style={{ background:"#1a1208", padding:"12px 48px", borderBottom:"1px solid #2a2018" }}>
            <input
              className="api-key-input"
              style={{ maxWidth: 480, background:"#0d0a06", borderColor:"#2a2018", color:"#c8b090" }}
              type="password"
              placeholder="Paste your Anthropic API key (sk-ant-...)..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            <p style={{ fontSize:11, color:"#5a4a38", marginTop:6 }}>Your key stays in this session only and is never stored.</p>
          </div>
        )}

        {tab === "search" && (
          <section className="hero">
            <div className="hero-grid">
              <div>
                <div className="hero-eyebrow">Powered by TheMealDB · Free & Open</div>
                <h1 className="hero-title"><strong>Search</strong> by<br /><em>ingredients</em></h1>
                <p className="hero-sub">Enter one or more ingredients (separated by commas) to discover new recipes. We'll find dishes that you can make.</p>
              </div>
              <div className="search-panel">
                <form onSubmit={handleSubmit}>
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="form-label" style={{ color: 'var(--gold)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' }}>Search by Ingredients</label>
                    <div className="search-row">
                      <input
                        className="search-input"
                        type="text"
                        placeholder="e.g. chicken, rice, onions... (comma-separated)"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="form-label" style={{ color: 'var(--gold)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' }}>Ingredients to Omit (optional)</label>
                    <div className="search-row">
                      <input
                        className="search-input"
                        type="text"
                        placeholder="e.g. peanuts, dairy, gluten... (comma-separated)"
                        value={omitQuery}
                        onChange={e => setOmitQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <button className="search-btn" type="submit" style={{ width: '100%', borderRadius: 4 }} disabled={loading || !query.trim()}>
                    {loading ? "…" : "Search"}
                  </button>
                </form>
                <div className="chips">
                  {SUGGESTIONS.map(s => (
                    <button key={s} className="chip" onClick={() => { setQuery(s); searchRecipes(s, omitQuery); }}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <main className="main">
          {tab === "search" && (
            <>
              {!searched && (
                <div className="state">
                  <span className="state-icon">🍽</span>
                  <div className="state-title">What are you craving today?</div>
                  <p className="state-sub">Search for a dish above, or pick a suggestion to get started.</p>
                </div>
              )}
              {loading && (
                <div className="state">
                  <span className="state-icon">🔍</span>
                  <div className="state-title">Searching recipes…</div>
                  <div className="dots"><div className="dot"/><div className="dot"/><div className="dot"/></div>
                </div>
              )}
              {!loading && searched && results.length === 0 && (
                <div className="state">
                  <span className="state-icon">🫙</span>
                  <div className="state-title">No recipes found</div>
                  <p className="state-sub">Try a different ingredient or dish name.</p>
                </div>
              )}
              {!loading && results.length > 0 && (
                <>
                  <div className="sec-head">
                    <h2 className="sec-title">Results</h2>
                    <span className="sec-count">{results.length} recipe{results.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="recipe-grid">
                    {results.map(meal => <RecipeCard key={meal.idMeal} meal={meal} onClick={setSelectedMeal} />)}
                  </div>
                </>
              )}
            </>
          )}

          {tab === "nutri" && <NutritionistTab apiKey={apiKey} />}
        </main>

        {selectedMeal && (
          <RecipeModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} apiKey={apiKey} />
        )}
      </div>
    </>
  );
}
