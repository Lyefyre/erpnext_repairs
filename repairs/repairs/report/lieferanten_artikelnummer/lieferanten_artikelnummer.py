# Copyright (c) 2013, libracore AG and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe

def execute(filters=None):
        columns, data = [], get_data(filters)
        columns = [
	"Item Code:Link/Item:200",
	"Item Name::200"]
        return columns, data
        
def get_data(filters):
        conditions = " 1 = 1"
        if filters.get('item'):
                conditions += " and name = '{0}'".format(filters.get('item'))
                
        return frappe.db.sql("""SELECT name, item_code from `tabItem` where {} """.format(conditions),as_list=1)
