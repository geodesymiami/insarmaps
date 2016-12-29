@extends('app')

@section('content')
<div class="container-fluid">

	@foreach ($requestParameters as $paramName => $paramValue)
		{{ $paramName }}
	@endforeach

</div>
@endsection