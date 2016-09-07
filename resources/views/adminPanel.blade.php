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
			<?php // might want to sort by name in controller to prevent anyone knowing id's of DB
			$curRow = 0;?>
			@foreach ($userPermissions as $userPermission)
				<tr>
					<td>{{ $userPermission["user"]->name }}</td>
					<td>
						<?php
							$permissionsString = "";

							foreach ($userPermission["permissions"] as $permission) {
								$permissionsString = $permissionsString . $permission . " ";
							}

							echo '<input type="text" value="' . $permissionsString . '" id="row-' . $curRow . '"';
						?>
					</td>
					<button class="btn btn-primary table-buttons" type="submit" id={{ $curRow }}>Set New Permissions</button>
				</tr>
				<?php $curRow++;?>	
			@endforeach
		</tbody>
	</table>
</div>
<script type="text/javascript">
	var userPermissions = <?php echo json_encode($userPermissions); ?>;
</script>
<script type="text/javascript" src="/js/adminPanel.js"></script>
@endsection