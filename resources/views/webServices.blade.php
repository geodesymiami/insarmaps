@extends('app')
@section('css-includes')
<link href="https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.css" rel="stylesheet">
<link href="/css/webservicesUI.css" rel="stylesheet">
<link href="/css/autocomplete.css" rel="stylesheet">
@endsection
@section('content')
<div class="container-fluid">
    <div id="webservice-explanation-paragraph">
        <h4>Acceptable Values for Parameters:</h4>
        <ul>
            <li>Longitude should be between -180.0 and 180.0. Ex: 131.67.</li>
            <li>Latitude should be between -90.0 and 90.0. Ex: 32.53</li>
            <li>Satellite - ex: Alos</li>
            <li>Relative Orbit - ex: 73</li>
            <li>First Frame - ex: 2950</li>
            <li>Mode - ex: SM</li>
            <li>Flight Direction - ex: D</li>
            <li>startTime should be in yyyy-mm-dd format. Ex: 1990-12-20.</li>
            <li>endTime should be in yyyy-mm-dd format. Ex: 2020-12-20.</li>
            <li>outputType should be json, dataset, or csv.</li>
            <li>WKT Linestring Box should be a valid, WKT Linestring</li>
        </ul>
    </div>
    <!-- TODO: delete webServicesDataset code - should be 4 of them in php, blade, js, and routes -->
    <div class="input-and-label-container">
        <label for="input-latitude">Longitude (required):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" value="131.67" id="input-longitude">
        </div>
    </div>
    <div class="input-and-label-container">
        <label for="input-latitude">Latitude (required):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" value="32.53" id="input-latitude">
        </div>
    </div>
    <div class="input-and-label-container">
        <label for="input-latitude">Satellite (optional):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" value="Alos" id="input-satellite">
            <div class="custom-input-dropdown hide-dropdown">
                <div class="caret"></div>
            </div>
        </div>
    </div>
    <div class="input-and-label-container">
        <label for="input-latitude">Relative Orbit (optional):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" value="73" id="input-relativeOrbit">
            <div class="custom-input-dropdown hide-dropdown">
                <div class="caret"></div>
            </div>
        </div>
    </div>
    <div class="input-and-label-container">
        <label for="input-latitude">First Frame (optional):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" value="2950" id="input-firstFrame">
            <div class="custom-input-dropdown hide-dropdown">
                <div class="caret"></div>
            </div>
        </div>
    </div>
    <div class="input-and-label-container">
        <label for="input-latitude">Mode (optional):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" value="SM" id="input-mode">
            <div class="custom-input-dropdown hide-dropdown">
                <div class="caret"></div>
            </div>
        </div>
    </div>
    <div class="input-and-label-container">
        <label for="input-latitude">Flight Direction (optional):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" value="D" id="input-flightDirection">
            <div class="custom-input-dropdown hide-dropdown">
                <div class="caret"></div>
            </div>
        </div>
    </div>
    <div class="input-and-label-container">
        <label for="input-latitude">Start Time (optional):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control date-input" value="1990-12-20" id="input-startTime">
        </div>
    </div>
    <div class="input-and-label-container">
        <label for="input-latitude">End Time (optional):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control date-input" value="2020-12-20" id="input-endTime">
        </div>
    </div>
    <div class="input-and-label-container">
        <label for="input-latitude">Output Type (optional):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" value="json" id="input-outputType">
            <div class="custom-input-dropdown hide-dropdown">
                <div class="caret"></div>
            </div>
        </div>
    </div>
    <div class="input-and-label-container" id="WKT-input-and-label-container">
        <label for="input-latitude">WKT Linestring Box (optional):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" value="LINESTRING(128.49609375 39.436192999314095,129.375 29.075375179558346,149.326171875 29.993002284551075,146.07421875 41.244772343082076,128.49609375 39.436192999314095)" id="input-WKT-Bbox">
        </div>
    </div>
    <div class="form-group">
        <label>webservice url:</label>
        <div class="form-control custom-input" id="form-webservice-url"></div>
    </div>
</div>
@section('js-includes')
<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.min.js" integrity="sha256-VazP97ZCwtekAsvgPBSUwPFKdrwD3unUfSGVYrahUqU=" crossorigin="anonymous"></script>
<script type="text/javascript" src="/js/AreaAttributesController.js"></script>
<script type="text/javascript" src="/js/Search.js"></script>
<script type="text/javascript" src="/js/helperFunctions.js"></script>
<script type="text/javascript" src="/js/webServicesUI.js"></script>
@endsection @endsection
