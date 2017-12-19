<?php
function binary_search($array, $toFind, $compareFunc) {
	$first = 0;
	$last = count($array) - 1;

	while (!($first > $last)) {
		$middle = (int) (($first + $last) / 2);

		$cmp = call_user_func($compareFunc, $array[$middle], $toFind);

		if ($cmp == 0) {
			return $array[$middle];
		}

		if ($cmp < 0) {
			$last = $middle - 1;
		} else {
			$first = $middle + 1;
		}
	}

	return NULL;
}