# -*- coding: utf-8 -*-
# Copyright (c) 2020, libracore AG and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document


class Repairs(Document):
    pass

@frappe.whitelist()
def create_stock(item):

    stock_entry = frappe.get_doc({
        "doctype": "Stock Entry",
        "to_warehouse": "Hauptlager - MU",
        "value_difference": "0.010000",
        "total_amount": "0.010000",
        "total_incoming_value": "0.010000",
        "title": "Reparaturartikel",
        "stock_entry_type": "Material Receipt"
    })
    stock_entry.append('items', {
        "item_code": item,
        "qty": 1
    })
    stock_entry.insert()
    stock_entry.save()

