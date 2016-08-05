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
Route::get("/point/{area}/{point}", "GeoJSONController@getDataForPoint")->name("getDataForPoint");
Route::get("/areas/", "GeoJSONController@getAreas")->name("getAreas");
Route::post("/points", "GeoJSONController@getPoints");
Route::controllers([
    'auth' => 'Auth\AuthController'
    // 'password' => 'Auth\PasswordController',
]);