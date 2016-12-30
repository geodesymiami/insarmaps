@extends('app')
@section('js-includes')
<script type="text/javascript" src="js/webServicesUI.js"></script>
@endsection
@section('content')
<div class="container-fluid">

	<div id="webservice-explanation-paragraph">
		<h4>Acceptable Values for Parameters:</h4>

		<br>dataset should be in UNAVCO naming format: [mission]_[beam_mode]_[relative_orbit]_[first_frame]_[last_frame (if more than one frame)]_[first_date]_[last_date]. Ex: Alos_SM_72_2970_2980_20070205_20110403.
		<br>longitude should be between -180.0 and 180.0. Ex: 131.67.
		<br>latitude should be between -90.0 and 90.0. Ex: 32.53
		<br>startTime should be in yyyy-mm-dd format. Ex: 1990-12-20.
		<br>endTime should be in yyyy-mm-dd format. Ex: 2020-12-20.
		<br>outputType should be json or plot.</br>
		<br>
	</div>

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