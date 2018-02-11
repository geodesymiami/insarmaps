<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class GoogleDriveController extends Controller {
    private static $H5_DRIVE_FOLDER = "%270B6tU3PZAQUfhV0ozd3h2NElpREk%27";

    public function getFilesInFolder(Request $request) {
        $apiKey = config("apiKeys.google_drive");
        $url = "https://www.googleapis.com/drive/v3/files?q=" . self::$H5_DRIVE_FOLDER . "+in+parents&key=" . $apiKey;

        return response((file_get_contents($url)))->header("Content-Type", "application/json");
    }
}

