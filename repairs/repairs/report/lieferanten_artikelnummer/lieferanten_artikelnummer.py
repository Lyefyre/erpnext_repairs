# Copyright (c) 2013, libracore AG and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe

def execute(filters=None):
	columns, data = [], []
	columns = ["Item Code:Link/Item:200"]

	if filters.item:
		item = filters.item
	else:
		item = "%"

	sql_query = "SELECT name FROM `tabItem`".format(item=item)

	data = frappe.db.sql(sql_query, as_list = True)
	#return columns, data
