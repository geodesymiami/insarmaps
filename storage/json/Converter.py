import json
import h5py
import numpy as np
from osgeo import gdal
import math
import time
import sys

# get name of h5 file and the groupname of that file's data
if (len(sys.argv) != 3):
	print "Incorrect number of arguments - see correct example below:"
	print "example: python Converter.py geo_timeseries_masked.h5 timeseries"
	sys.exit()

# ignore argv[0], which is the name of the script
file_name = sys.argv[1]
group_name = sys.argv[2]

# ---------------------------------------------------------------------------------------
# try open timeseries file using GDAL to get attributes - if no such file exists, exit
# unfortunately, try/except statements dont work when opening h5 files using gdal
f = gdal.Open(file_name)
if f is None:
	sys.exit()

# convert attributes in metadata to float, later use values to calculate latitude, longitude
metadata = f.GetMetadata()
x_step = float(metadata["timeseries_X_STEP"])
y_step = float(metadata["timeseries_Y_STEP"])
x_first = float(metadata["timeseries_X_FIRST"])
y_first = float(metadata["timeseries_Y_FIRST"])

# close GDAL file - found solution online since GDAL library lacked a file.close() function
f = None

# ---------------------------------------------------------------------------------------
# now use h5py to get displacement values and assign latitude/longitude to each value
file = h5py.File(file_name,  "r")

# try opening this group in the file - if no such group exists, exit
try: 
	group = file[group_name]
except: 
	print "unable to find group %s" % group_name
	sys.exit()

# start clock to track how long conversion process takes
start_time = time.clock()

# iterate through the group to get the dataset names
dataset_keys = []
timeseries_datasets = {}
for key in group.iterkeys():
	dataset_keys.append(key)

# sort the dates and then then use these date keys to get
# datasets and add them (stored in memory) to a dictionary 
dataset_keys.sort() 
for key in group.iterkeys():
	timeseries_datasets[key] = group[key][()]

file.close()	

# get row and column length of the dataset, which is formatted as a 2-d array
num_columns = timeseries_datasets[dataset_keys[0]][0].size
num_rows = timeseries_datasets[dataset_keys[0]].size / num_columns
print "columns: %d" % num_columns
print "rows: %d" % num_rows

# create a big array called siu_man to store our json point objects
siu_man = []

# size of sub-array chunks in siu man array
chunk_size = 20000

# outer loop increments row = longitude
# inner loop increments column = latitude
longitude = y_first - y_step
latitude = x_first - x_step

# ---------------------------------------------------------------------------------------
def read_data(latitude, longitude, num_rows, num_columns): 
	# to read a whole dataset of 1800x1800 values, change code to 
	# row in range(0, num_rows) and col in range(0, num_columns) 

	# create sub arrays in siu man array to store chunks of points
	counter = 1
	displacement_values = {}
	chunk_points = []
	for (row, col), value in np.ndenumerate(timeseries_datasets[dataset_keys[0]]):
		latitude = x_first + (col* x_step)
		longitude = y_first + (row*y_step) 
		displacement = float(value)	
		# if value is not equal to naN, create a new json point object and append to siu_man array
		if not math.isnan(displacement):
			displacement_values = []
			# get displacement values for all the dates
			for key in dataset_keys:
				displacement = float(timeseries_datasets[key][row][col])
				displacement_values.append(displacement)

			data = {
   			"type": "Feature",
   			"geometry": {"type": "Point", "coordinates": [latitude, longitude]},	
   			"properties": {"displacement": displacement_values}
			}	
			# allocate memory space for siu_man array in beginning 
			chunk_points.append(data)

			# if chunk size is reached, then clear chunk_points arr and make new one
			if counter % chunk_size == 1 and counter > 1:
				siu_man.append(chunk_points)
				chunk_points = []

			counter += 1
	# create logic to get the last points < chunk_size
	siu_man.append(chunk_points)		


# ---------------------------------------------------------------------------------------
# call the read_data() function
read_data(latitude, longitude, num_rows, num_columns)

# dump the data from siu_man array into a newly created json file, then close json file
counter = 1
for chunk in siu_man:
	full_data = {
	"type": "FeatureCollection",
	"dates": dataset_keys, 
	"features": chunk
	}
	file = file_name + "test_chunk_" + str(counter) + ".json"
	json_file = open(file, "w")
	string_json = json.dumps(full_data, json_file, indent=4, separators=(',',':'))
	json_file.write("%s" % string_json)
	json_file.close()
	counter += 1

# check how long process took
end_time =  time.clock()
print ("time elapsed: " + str(end_time - start_time))