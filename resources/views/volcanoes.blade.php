@extends('app')
@section('css-includes')
<link href="/css/examples.css" rel="stylesheet">
@endsection
@section('content')
<div class="container-fluid">
	@foreach ($datasets as $satellite => $datasets)
		<div class="row">
			<div class="col text-center"><h3>{{ $satellite }}</h3></div>
		</div>
		<div class="row">
			@foreach ($datasets as $dataset)
				<div class="col-xs-6">
					<iframe src="/start/{{ $lat }}/{{ $long }}/10/?startDataset={{ $dataset }}&flyToDatasetCenter=false"></iframe>
				</div>
			@endforeach
		</div>
	@endforeach
</div>
@section('js-includes')
@endsection @endsection
