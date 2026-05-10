import { HashRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { AppDataProvider } from "./AppDataContext";
import {
  ActivityLogPage,
  AgentOrchestrationPage,
  AgentsPage,
  ApprovalsPage,
  DashboardPage,
  ExperimentsPage,
  IdeasPage,
  LaunchControlPage,
  MarketIntelligencePage,
  MissionBriefPage,
  OpenClawSystemPage,
  ProductionPipelinePage,
  QuestsPage,
  RealPilotPage,
  SecondBrainPage,
  SettingsPage,
  TeamLeaderChatPage,
  ValidationPage,
} from "./pages";

export function App() {
  return (
    <AppDataProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/teamleader-chat" element={<TeamLeaderChatPage />} />
            <Route path="/mission-briefs" element={<MissionBriefPage />} />
            <Route path="/orchestration" element={<AgentOrchestrationPage />} />
            <Route path="/quests" element={<QuestsPage />} />
            <Route path="/ideas" element={<IdeasPage />} />
            <Route path="/validation" element={<ValidationPage />} />
            <Route path="/real-pilot" element={<RealPilotPage />} />
            <Route path="/market-intelligence" element={<MarketIntelligencePage />} />
            <Route path="/experiments" element={<ExperimentsPage />} />
            <Route path="/production" element={<ProductionPipelinePage />} />
            <Route path="/launch-control" element={<LaunchControlPage />} />
            <Route path="/second-brain" element={<SecondBrainPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/activity-log" element={<ActivityLogPage />} />
            <Route path="/openclaw-system" element={<OpenClawSystemPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppDataProvider>
  );
}
