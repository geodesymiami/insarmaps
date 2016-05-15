import json
import h5py
import numpy as np
from osgeo import gdal
import math
import time
import os
import sys

# ---------------------------------------------------------------------------------------
# FUNCTIONS
# ---------------------------------------------------------------------------------------
# returns a sorted array of keys to datasets in a specified group in the h5 file
def get_keys(): 
	keys = []
	for key in group.iterkeys():
		keys.append(key)
	keys.sort()	
	return keys
# ---------------------------------------------------------------------------------------
# returns a dictionary of datasets that are stored in memory to speed up h5 read process
def get_datasets(): 
	datasets = {}
	for key in dataset_keys:
		datasets[key] = group[key][()]	
	return datasets
# ---------------------------------------------------------------------------------------
def read_data(): 

	# create sub arrays in siu man array to store chunks of points
	counter = 1
	displacement_values = {}
	chunk_points = []
	# outer loop increments row = longitude, inner loop increments column = latitude
	for (row, col), value in np.ndenumerate(timeseries_datasets[dataset_keys[0]]):
		latitude = x_first + (col * x_step)
		longitude = y_first + (row * y_step) 
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
# create a json file out of an array within the 2d siu_man array
# then put json file into directory named after the h5 file
def make_json_file(): 

	full_data = {
	"type": "FeatureCollection",
	"dates": dataset_keys, 
	"features": chunk
	}

	file_name = "chunk_" + str(counter) + ".json"
	json_file = open(path_name + "/" + file_name, "w")
	# json_file = open(path_name + "/" + file_name, "w")
	string_json = json.dumps(full_data, json_file, indent=4, separators=(',',':'))
	json_file.write("%s" % string_json)
	json_file.close()

# ---------------------------------------------------------------------------------------
# START OF EXECUTABLE
# ---------------------------------------------------------------------------------------
# get name of h5 file and the groupname of that file's data
if (len(sys.argv) != 4):
	print "Incorrect number of arguments - see correct example below:"
	print "example: python Converter.py geo_timeseries_masked.h5 timeseries /Users/zishiwu/Desktop/data"
	sys.exit()

file_name = sys.argv[1]
group_name = sys.argv[2]
path_name = sys.argv[3]

# ---------------------------------------------------------------------------------------
# open h5 file using GDAL to get metadata attributes - if no such file exists, exit
f = gdal.Open(file_name)
if f is None:
	print "Invalid h5 file"
	sys.exit()

# convert attributes to float, later use values to calculate latitude, longitude
metadata = f.GetMetadata()
x_step = float(metadata["timeseries_X_STEP"])
y_step = float(metadata["timeseries_Y_STEP"])
x_first = float(metadata["timeseries_X_FIRST"])
y_first = float(metadata["timeseries_Y_FIRST"])

# close GDAL file this way since GDAL library lacks a close function
f = None

# ---------------------------------------------------------------------------------------
# use h5py to open a sepcified group in the h5 file 
# then read datasets from h5 file into memory for faster reading of data
file = h5py.File(file_name,  "r")
try: 
	group = file[group_name]
except: 
	print "unable to find group %s" % group_name
	sys.exit()

# get keys and datasets in the group
dataset_keys = get_keys()
timeseries_datasets = get_datasets()
file.close()	

# ---------------------------------------------------------------------------------------
# start clock to track how long conversion process takes
start_time = time.clock()

# get and display the row and column length of the datasets
num_columns = timeseries_datasets[dataset_keys[0]][0].size
num_rows = timeseries_datasets[dataset_keys[0]].size / num_columns
print "columns: %d" % num_columns
print "rows: %d" % num_rows

# create 2d siu_man array to store smaller chunk arrays of json point objects
siu_man = []

# set size of sub-array chunks in siu man array
chunk_size = 20000

# initialize latitude and longitude
longitude = y_first - y_step
latitude = x_first - x_step

# ---------------------------------------------------------------------------------------
# read data into siu_man array
read_data()

# check if directory to put json files exists in specified path - if not, create it
# example: python Converter.py geo_timeseries_masked.h5 timeseries /Users/zishiwu/Desktop
# creates /Users/zishiwu/Desktop/geo_timeseries_masked folder to put json files in
directory_path = path_name
does_exist = os.path.isdir(directory_path)

if not does_exist:
	json_directory = os.mkdir(directory_path)

# create json files named in format: chunk_1.json, chunk_2.json, etc.
# json files will be put into a directory named after the converted h5 file

counter = 1
for chunk in siu_man:
	make_json_file()
	counter += 1

# ---------------------------------------------------------------------------------------
# check how long it took to read h5 file data and create json files
end_time =  time.clock()
print ("time elapsed: " + str(end_time - start_time))
# ---------------------------------------------------------------------------------------