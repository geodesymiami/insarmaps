@extends('app')
@section('css-includes')
<link href="/css/examples.css" rel="stylesheet">
@endsection
@section('content')
<div class="container-fluid">
	<p>To add datasets to a web page, add an iframe as follows:</p>
	<pre>
	@php
		$html = "<code class='html'>&lt;iframe src='";
		$html .= URL::to("/") . "/start/LAT/LONG/ZOOM/&amp;onlyShowDatasets=NAME1, NAME2'&gt;&lt;/iframe&gt;</code>";
		echo $html;
	@endphp
	</pre>
	<p>Where LAT, LONG, and ZOOM, are the starting latitude, longitude, and zoom level of the map, respectively, and onlyShowDatasets is a comma-separated list of the unavco_names of datasets to display. All of these parameters are optional, and excluding onlyShowDatasets will display all available datasets in the database.</p>
	<h3>Ecuador:</h3>
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
	$url = URL::to("/") . "/start/-0.5/-78.5/7/?onlyShowDatasets=";
	foreach ($datasets as $datasetName) {
		$url .= $datasetName . ",";
	}
	echo "<iframe src=$url></iframe>";
	@endphp
	<h3>Hawaii:</h3>
	@php
	$datasets = [
		"COSMO-SKYMED_HIMAGE_010_0000_20130904-20170611_0000_00000",
		"CSK_HIMAGE_091_0000_20130914-20170609_0000_00000"
	];
	$url = URL::to("/") . "/start/20.3/-155.6/6/?onlyShowDatasets=";
	foreach ($datasets as $datasetName) {
		$url .= $datasetName . ",";
	}
	echo "<iframe src=$url></iframe>";
	@endphp
</div>
@section('js-includes')
@endsection @endsection