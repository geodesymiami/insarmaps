import os
import sys
from os import listdir
from os.path import isfile, join
import subprocess

# python Convert_multiple.py <folder of h5 files to be convertered>
print "length of command argv: " + str(len(sys.argv))
if (len(sys.argv) != 2):
    print "Incorrect number of arguments - see correct example below:"
    print "example: python run_multiple_converter.py <folder of h5 files>"
    sys.exit()

# check if folder given is a directory
folder = sys.argv[1]
if not os.path.isdir(folder): 
    print folder + " is not a folder"
    sys.exit()

# get all the h5 files from the directory
folder_path = os.path.abspath(folder)
converter_path = os.getcwd()

all_files = [f for f in listdir(folder_path) if isfile(join(folder_path, f))]
h5_files = []
for f in all_files:
    if f[len(f)-3:] == '.h5':
        h5_files.append(folder_path + "/" + f)

# run multiple processes of converting h5 files
for f in h5_files:
    # command = 'python Converter_no_database.py ' + f
    p = subprocess.Popen(['python', 'Converter.py', f])
    print "spawned process: " + str(p)
