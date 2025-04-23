============== Install commands if don't have ==============
npm install express mysql bcrypt
npm install express mysql2 bcrypt
npm install nodemon
============================================================



============= Run commands =============
npm run dev
========================================


============== Test Accounts ==============
Student Accounts 
6631502028@lamduan.mfu.ac.th
1111

Lecturer Account
surapong@mfu.ac.th
surapong123!@#

Staff Account
sunday@mfu.ac.th
Sunday123

Admin Account
admin
admin123!@#
=====================================



============== Database ERD ============== 
students → borrow_requests = 1:M (One student can make many requests).

assets → borrow_requests = 1:M (One asset can have many requests).

assets → categories = M:1 (Many assets belong to one category).

borrow_requests → history = 1:1 (Each request entry is logged once in history).
=====================================


