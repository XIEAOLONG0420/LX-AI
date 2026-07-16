import { useState, useCallback } from "react";
import Home from "./components/Home";
import Care from "./components/Care";
import Entertainment from "./components/Entertainment";
import Settings from "./components/Settings";
import { Users, Heart, Music, Settings as SettingsIcon } from "lucide-react";

function App() {
  const [activeTab, setActiveTab] = useState("home");

  const [familyAction, setFamilyAction] = useState(null);
  const [entertainmentAction, setEntertainmentAction] = useState(null);

  const handleAppAction = useCallback((toolName, toolArgs) => {
    switch (toolName) {
      case "navigate_to_page":
        setActiveTab(toolArgs.page);
        break;
      case "call_family_member":
        setFamilyAction({ type: "call", member: toolArgs.member });
        setActiveTab("home");
        break;
      case "play_entertainment":
        setEntertainmentAction({ type: "play", category: toolArgs.category });
        setActiveTab("entertainment");
        break;
      case "answer_question":
        break;
      case "get_weather":
        break;
      default:
        console.warn("Unknown tool:", toolName, toolArgs);
    }
  }, []);

  const tabs = [
    { id: "home", icon: Users },
    { id: "health", icon: Heart },
    { id: "entertainment", icon: Music },
    { id: "settings", icon: SettingsIcon },
  ];

  return (
    <div className="flex flex-col h-screen w-full mx-auto bg-bg-warm text-text-primary relative overflow-hidden" style={{ maxWidth: 480 }}>
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === "home" && <Home onAction={handleAppAction} />}
        {activeTab === "health" && <Care />}
        {activeTab === "entertainment" && (
          <Entertainment
            pendingAction={entertainmentAction}
            onActionHandled={() => setEntertainmentAction(null)}
          />
        )}
        {activeTab === "settings" && <Settings />}
      </div>

      {/* Bottom Navigation - icon only, no text */}
      <div className="absolute bottom-0 w-full h-20 bg-white/90 backdrop-blur-lg border-t border-accent-light flex justify-around items-center px-2 z-50 shadow-[0_-2px_12px_rgba(0,0,0,0.05)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 ${
                isActive
                  ? "bg-accent text-white shadow-md scale-110"
                  : "text-text-muted hover:text-accent"
              }`}
            >
              <Icon size={isActive ? 28 : 24} strokeWidth={isActive ? 2.5 : 2} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default App;
