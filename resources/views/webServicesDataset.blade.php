@extends('app')
@section('js-includes')
<script type="text/javascript" src="js/webServicesDatasetUI.js"></script>
@endsection
@section('content')
<div class="container-fluid">

	<div id="webservice-dataset-explanation-paragraph">
		<h4>Acceptable Values for Parameters:</h4>

		<br>Satellite name should begin with a capital case letter (ex: Alos, Csk)</br>
		<br>
	</div>

	<div class="input-group">
		Satellite (optional)
		<input type="text" class="form-control" placeholder="Alos" id="input-satellite">
	</div>
	<div class="input-group">
		Relative Orbit (optional):
		<input type="text" class="form-control" placeholder="73" id="input-relativeOrbit">
	</div>
	<div class="input-group">
		First Frame (optional):
		<input type="text" class="form-control" placeholder="2950" id="input-firstFrame">
	</div>
	<div class="input-group">
		Mode (optional):
		<input type="text" class="form-control" placeholder="SM" id="input-mode">
	</div>
	<div class="input-group">
		Flight Direction (optional):
		<input type="text" class="form-control" placeholder="D" id="input-flightDirection">
	</div>
	<div id="enter-button">
        <button class="btn btn-primary-outline clickable-button">Enter</button>
    </div>

    <div class="form-group">
		webservice url:
		<input type="text" class="form-control" placeholder="http://homestead.app/WebServicesDataset?satellite=Alos&relativeOrbit=73&firstFrame=2950&mode=SM&flightDirection=D" id="form-webservice-url">
	</div>
</div>
@endsection