#! /usr/bin/env python

import urllib2
import getopt
import os
import argparse

class BasicHTTP:
	def get(url):
		res = urllib2.urlopen(url)
		return response.read()

def main():
	parser = argparse.ArgumentParser(description='Query insarmaps database.')
	parser.add_argument("s", "--satellite", help="satellite to search for")
	parser.add_argument("r", "--relativeOrbit", help="relative orbit to search for")
	parser.add_argument("f", "--firstFrame", help="first frame to search for")
	parser.add_argument("m", "--mode", help="mode to search for")
	parser.add_argument("d", "--flightDir", help="flight direction to search for")

	parse.parse_args()

if __name__ == '__main__':
	main()
