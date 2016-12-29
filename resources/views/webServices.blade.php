@extends('app')
@section('js-includes')
<script type="text/javascript" src="js/webServicesUI.js"></script>
@endsection
@section('content')
<div class="container-fluid">
	<!-- Input parameters for webservice -->
	<div class="input-group">
		longitude (required)
		<input type="text" class="form-control" placeholder="131.67" id="input-longitude">
	</div>
	<div class="input-group">
		latitude (required):
		<input type="text" class="form-control" placeholder="32.53" id="input-latitude">
	</div>
	<div class="input-group">
		dataset (required):
		<input type="text" class="form-control" placeholder="Alos_SM_72_2970_2980_20070205_20110403" id="input-dataset">
	</div>
	<div class="input-group">
		startTime (optional):
		<input type="text" class="form-control" placeholder="1990-12-20" id="input-startTime">
	</div>
	<div class="input-group">
		endTime (optional):
		<input type="text" class="form-control" placeholder="2020-12-20" id="input-endTime">
	</div>
	<div class="input-group">
		outputType (optional):
		<input type="text" class="form-control" placeholder="plot" id="input-outputType">
	</div>

	<div id="enter-button">
        <button class="btn btn-primary-outline clickable-button">Enter</button>
    </div>

    <div class="form-group">
		webservice url:
		<input type="text" class="form-control" placeholder="http://homestead.app/WebServices?longitude=131.67&latitude=32.53&dataset=Alos_SM_72_2970_2980_20070205_20110403&startTime=1990-12-20& endTime=2020-12-20&outputType=plot" id="form-webservice-url">
	</div>
</div>
@endsection