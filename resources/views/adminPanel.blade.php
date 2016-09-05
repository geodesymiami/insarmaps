@extends('app')

@section('content')
<div class="container-fluid">
	<table class="table">
		<thead>
			<tr>
				<th>User</th>
				<th>Permissions</th>
			</tr>
		</thead>
		<tbody>
			@foreach ($userPermissions as $userPermission)
				<tr>
					<td>{{ $userPermission["user"]->name }}</td>
					<td>
					@foreach ($userPermission["permissions"] as $permission)
						{{ $permission }},
					@endforeach
					</td>
				</tr>			
			@endforeach
		</tbody>
	</table>
</div>
@endsection