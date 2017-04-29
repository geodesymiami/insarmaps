<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It's a breeze. Simply tell Laravel the URIs it should respond to
| and give it the controller to call when that URI is requested.
|
*/

/*Route::get('/', function () {
    return view('map');
});*/

Route::get('/', 'MyController@returnPage')->name('returnPage');
Route::post('/data', 'MyController@convertData')->name('convertData');
Route::get("/file/{area}/{fileChunkNumber}", "GeoJSONController@getJSONFileChunk")->name("getJSONFileChunk");
Route::get("/textFile/{area}/{point}", "GeoJSONController@pointDataToTextFile")->name("pointDataToTextFile");
Route::get("/point/{area}/{point}", "GeoJSONController@getDataForPoint")->name("getDataForPoint");
Route::get("/areas/", "GeoJSONController@getAreas")->name("getAreas");
Route::get("/midas", "ThirdPartyDataNoCorsController@getmidas")->name("getmidas");
Route::get("/IGEPNEarthquakeFeed", "ThirdPartyDataNoCorsController@getIGEPNEarthquakeFeed")->name("getIGEPNEarthquakeFeed");
Route::get("/HawaiiReloc", "ThirdPartyDataNoCorsController@getHawaiiReloc")->name("getHawaiiReloc");
Route::get("/USGSMonthlyFeed", "ThirdPartyDataNoCorsController@getUSGSMonthlyFeed")->name("getUSGSMonthlyFeed");

Route::post("/points", "GeoJSONController@getPoints");
Route::controllers([
    'auth' => 'Auth\AuthController',    
    // 'password' => 'Auth\PasswordController',
]);
Route::get("/adminPanel", "AdminPanelController@getAdminPanel");
Route::post("/adminPanel/setPermissions/", "AdminPanelController@postSetUserPermissions");
Route::get("/test/{table}/{table2}", "PermissionsController@getAllUserPermissions");

// web services for querying points
Route::get("/WebServices/", "WebServicesController@processRequest");
Route::get("/WebServicesUI/", "WebServicesController@renderView");

// web services for querying datasets
Route::get("/WebServicesDataset/", "WebServicesDatasetController@processRequest");
Route::get("/WebServicesDatasetUI/", "WebServicesDatasetController@renderView");

// web services for querying dataset via bounding box
Route::get("/WebServicesBox/", "WebServicesBoxController@processRequest");
// get point id's in a bounding bos for subsetting
Route::get("/WebServicesBox/{area}/{lineString}", "WebServicesBoxController@getPointNumbersInBox");

Route::post("/WebServices/uploadMbtiles", "WebServicesController@uploadMbtiles")->middleware("auth");
