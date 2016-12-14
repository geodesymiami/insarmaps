#! /usr/env/python

from pylab import *
import getopt
import sys

def usage():
	print '''
		Simple script to get color scale values from pylab to put into a javascript array

		get_color_scale.py -s SCALE_NAME
	'''

def main(argv):
	# default values
	scale_name = "jet"
	max = 0.02
	min = -0.02

	try:
		opts, extraArgs = getopt.getopt(argv[1:],'s:', ['min=', 'max='])
	except getopt.GetoptError:
		print 'Error while retrieving operations - exit'
		usage()
		sys.exit()

	for o, a in opts:
		if o == '-s':
			scale_name = a
		elif o == '--min':
			min = float(a)
		elif o == '--max':
			max = float(a)
		else:
			assert False, "unhandled option " + o + " - exit"
			sys.exit()

	cmap = cm.get_cmap(scale_name)

	color_range = abs(min) + abs(max)

	current_min = min
	increment = color_range / float(cmap.N)
	 
	for i in range(cmap.N):
		rgb=cmap(i)[:3]

		#print ("[" + str(current_min) + ", '" + matplotlib.colors.rgb2hex(rgb) + "'],")
		
		print ("'" + matplotlib.colors.rgb2hex(rgb) + "',")
		current_min += increment

if __name__ == '__main__':
	main(sys.argv)

