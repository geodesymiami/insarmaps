@extends('app')
@section('css-includes')
<link href="/css/examples.css" rel="stylesheet">
@endsection
@section('content')
<div class="container-fluid">
	<p>To add datasets to a web page, add an iframe as follows:</p>
	@php
		$html = "<pre><code class='html'>&lt;iframe src='";
		$html .= URL::to("/") . "/start/LAT/LONG/ZOOM/&amp;onlyShowDatasets=NAME1, NAME2&ampzoomOut=false'&gt;&lt;/iframe&gt;</code></pre>";
	@endphp
	{!! $html !!}
	<p>Where LAT, LONG, and ZOOM, are the starting latitude, longitude, and zoom level of the map, respectively, and onlyShowDatasets is a comma-separated list of the unavco_names of datasets to display. Adding zoomOut=false prevents zooming out to zooms less than the one specified. All of these parameters are optional, and excluding onlyShowDatasets will display all available datasets in the database.</p>
	@php
	$datasets = [
		"TSX_SL_119_0000_20150718-20170724_0000_00000",
		"COSMO-SKYMED_SM_5800_0000_20140809-20160408_0000_00000",
		"TERRASAR-X_SL_119_0000_20150718-20170713_0000_00000",
		"TERRASAR-X_SM_051_0000_20141114-20150509_0000_00000_Pichincha",
		"ALOS_FB07_110_7170_20061223-20100818_0000_00000",
		"TERRASAR-X_SM_051_0000_20120126-20130911_0000_00000_Pichincha",
		"TERRASAR-X_SM_051_0000_20120126-20130911_0000_00000_SouthQuito",
		"TERRASAR-X_SM_051_0000_20120126-20130911_0000_00000",
		"TERRASAR-X_SM_051_0000_20160128-20170526_0000_00000_Pichincha"
	];
	$ecuadorUrl = URL::to("/") . "/start/-0.5/-78.5/7.5/?onlyShowDatasets=";
	foreach ($datasets as $datasetName) {
		$ecuadorUrl .= $datasetName . ",";
	}
	$ecuadorUrl .= "&zoomOut=false";
	$ecuadorCode = "<pre><code class='html'>&lt;iframe src='". $ecuadorUrl . "'&gt;&lt;/iframe&gt;</code></pre>";
	$datasets = [
		"COSMO-SKYMED_HIMAGE_010_0000_20130904-20170611_0000_00000",
		"CSK_HIMAGE_091_0000_20130914-20170609_0000_00000"
	];
	$hawaiiUrl = URL::to("/") . "/start/19.7/-155.6/7.5/?onlyShowDatasets=";
	foreach ($datasets as $datasetName) {
		$hawaiiUrl .= $datasetName . ",";
	}
	$hawaiiUrl .= "&zoomOut=false";
	$hawaiiCode = "<pre><code class='html'>&lt;iframe src='". $hawaiiUrl . "'&gt;&lt;/iframe&gt;</code></pre>";
	@endphp
	<div class="row">
		<div class="col-xs-6">
			<h3>Ecuador:</h3>
			{!! $ecuadorCode !!}
		</div>
		<div class="col-xs-6">
			<h3>Hawaii:</h3>
			{!! $hawaiiCode !!}
		</div>
	</div>
	<div class="row">
		<div class="col-xs-6">
			<iframe src= {{ $ecuadorUrl }}></iframe>
		</div>
		<div class="col-xs-6">
			<iframe src= {{ $hawaiiUrl }}></iframe>
		</div>
	</div>
	@php
	$startDatasetURL = URL::to("/") . "/start/-0.5/-78.5/12.5/?startDataset=TERRASAR-X_SM_051_0000_20160128-20170526_0000_00000_Pichincha&zoomOut=false";
	$startDatasetCode = "<pre><code class='html'>&lt;iframe src='". $startDatasetURL . "'&gt;&lt;/iframe&gt;</code></pre>";
	@endphp
	<div class="row">
		<p class="col-xs-12">To load a map with a pre-selected dataset, add "startDataset=UNAVCO_NAME" to the URL. UNAVCO_NAME represents the unique Unavco name given to the dataset, which can be found out using web services:</p>
		<div class="col-xs-6">
			{!! $startDatasetCode !!}
			<iframe src= {{ $startDatasetURL }}></iframe>
			}
		</div>
	</div>
	<div class="row">
		<div class="col-xs-12">
			<p>This is how to obtain the points from every dataset at a latitude and longitude point via the webservices API:</p>
			@php
			$urlMultiPoints = URL::to("/") . "/WebServices?longitude=130.78262&latitude=31.78947";
			$urlSinglePoint = $urlMultiPoints . "&dataset=ALOS_SM_073_2950_20070107-20110420_0000_00000";
			$urlBboxWithSample = URL::to("/") . "/WebServices?" . "dataset=ALOS_SM_422_0050_20070220-20110116_0000_00000&box=LINESTRING(98.66392135620117 3.5807975550005735,98.66392135620117 3.5776708456874085,98.66782665252686 3.577499518841305,98.66782665252686 3.5807118918739365,98.66392135620117 3.5807975550005735)&downsampleFactor=2";
			@endphp
			<pre><code class="html">{!! $urlMultiPoints !!}</code></pre>
			<p>Specifying &amp;dataset specifies which dataset to search for a point in:</p>
			<pre><code class="html">{!! $urlSinglePoint !!}</code></pre>
			<p>To search for multiple points within a bounding box in a dataset, along with a sampling factor, use:</p>
			<pre><code class="html">{!! $urlBboxWithSample !!}</code></pre>
		</div>
	</div>
</div>
@section('js-includes')
@endsection @endsection