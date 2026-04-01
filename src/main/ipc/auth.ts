import { ipcMain } from "electron";
import { authService } from "../services/AuthService";

export function registerAuthHandlers() {
  ipcMain.handle("auth:login", async () => {
    return await authService.signIn();
  });

  ipcMain.handle("auth:logout", async () => {
    return await authService.signOut();
  });

  ipcMain.handle("auth:status", async () => {
    return {
      isSignedIn: authService.isSignedIn(),
      auth: authService.getStoredAuth(),
    };
  });
}
