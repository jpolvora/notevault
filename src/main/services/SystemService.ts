import { app } from "electron";
import { UserSettings } from "../../shared/types";

export class SystemService {
  /**
   * Updates the Windows Login Item settings based on the user's autoStart preference.
   */
  public updateLoginSettings(settings: UserSettings) {
    if (process.platform !== "win32") return;

    app.setLoginItemSettings({
      openAtLogin: settings.autoStart,
      path: app.getPath("exe"),
      args: settings.startMinimized ? ["--hidden"] : [],
    });
  }

  /**
   * Initializes system settings on startup.
   */
  public init(settings: UserSettings) {
    this.updateLoginSettings(settings);

    // Check if we should start hidden
    const isHidden = process.argv.includes("--hidden");
    if (isHidden && settings.startMinimized) {
      // We handle this in main-index.ts too, but we can have it here as well.
    }
  }
}

export const systemService = new SystemService();
