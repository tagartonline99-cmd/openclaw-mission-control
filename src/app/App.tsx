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
  MarketIntelligencePage,
  OpenClawSystemPage,
  ProductionPipelinePage,
  QuestsPage,
  RealPilotPage,
  SecondBrainPage,
  SettingsPage,
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
            <Route path="/orchestration" element={<AgentOrchestrationPage />} />
            <Route path="/quests" element={<QuestsPage />} />
            <Route path="/ideas" element={<IdeasPage />} />
            <Route path="/validation" element={<ValidationPage />} />
            <Route path="/real-pilot" element={<RealPilotPage />} />
            <Route path="/market-intelligence" element={<MarketIntelligencePage />} />
            <Route path="/experiments" element={<ExperimentsPage />} />
            <Route path="/production" element={<ProductionPipelinePage />} />
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
