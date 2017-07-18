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
            <li>outputType should be json, plot, or dataset.</li>
            <li>
                <span id="example-url">Example webservice url: http://homestead.app/WebServices?longitude=131.67&latitude=32.53&satellite=Alos  &relativeOrbit=73&firstFrame=2950&mode=SM&flightDirection=D& endTime=2020-12-20&outputType=json</span>
            </li>
        </ul>
    </div>
    <!-- TODO: delete webServicesDataset code - should be 4 of them in php, blade, js, and routes -->
    <div class="input-and-label-container">
        <label for="input-latitude">Longitude (required):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" placeholder="131.67" id="input-longitude">
        </div>
    </div>
    <div class="input-and-label-container">
        <label for="input-latitude">Latitude (required):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" placeholder="32.53" id="input-latitude">
        </div>
    </div>
    <div class="input-and-label-container">
        <label for="input-latitude">Satellite (optional):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" placeholder="Alos" id="input-satellite">
            <div class="custom-input-dropdown">
                <div class="caret"></div>
            </div>
        </div>
    </div>
    <div class="input-and-label-container">
        <label for="input-latitude">Relative Orbit (optional):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" placeholder="73" id="input-relativeOrbit">
            <div class="custom-input-dropdown">
                <div class="caret"></div>
            </div>
        </div>
    </div>
    <div class="input-and-label-container">
        <label for="input-latitude">First Frame (optional):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" placeholder="2950" id="input-firstFrame">
            <div class="custom-input-dropdown">
                <div class="caret"></div>
            </div>
        </div>
    </div>
    <div class="input-and-label-container">
        <label for="input-latitude">Mode (optional):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" placeholder="SM" id="input-mode">
            <div class="custom-input-dropdown">
                <div class="caret"></div>
            </div>
        </div>
    </div>
    <div class="input-and-label-container">
        <label for="input-latitude">Flight Direction (optional):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" placeholder="D" id="input-flightDirection">
            <div class="custom-input-dropdown">
                <div class="caret"></div>
            </div>
        </div>
    </div>
    <div class="input-and-label-container">
        <label for="input-latitude">Start Time (optional):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" placeholder="1990-12-20" id="input-startTime">
        </div>
    </div>
    <div class="input-and-label-container">
        <label for="input-latitude">End Time (optional):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" placeholder="2020-12-20" id="input-endTime">
        </div>
    </div>
    <div class="input-and-label-container">
        <label for="input-latitude">Output Type (optional):</label>
        <div class="input-group custom-input-container">
            <input type="text" class="form-control" placeholder="plot" id="input-outputType">
            <div class="custom-input-dropdown">
                <div class="caret"></div>
            </div>
        </div>
    </div>
    <div class="form-group">
        webservice url:
        <div class="form-control custom-input" data-text="http://homestead.app/WebServices?longitude=131.67&latitude=32.53&satellite=Alos&relativeOrbit=73&firstFrame=2950&mode=SM&flightDirection=D& endTime=2020-12-20&outputType=json" id="form-webservice-url"></div>
    </div>
</div>
@section('js-includes')
<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.min.js" integrity="sha256-VazP97ZCwtekAsvgPBSUwPFKdrwD3unUfSGVYrahUqU=" crossorigin="anonymous"></script>
<script type="text/javascript" src="/js/AreaAttributesController.js"></script>
<script type="text/javascript" src="/js/search.js"></script>
<script type="text/javascript" src="/js/helperFunctions.js"></script>
<script type="text/javascript" src="/js/webServicesUI.js"></script>
@endsection @endsection
