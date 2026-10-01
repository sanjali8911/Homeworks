# #Sum program input 2variable to typecast you just surround it with brackets

# # variable tyepe  str int float bool can only concatenate str (not "int") to str
# # type coversion auto by compiler typecast cast is done by programmer
# #operations performed on strings don't change  the actual strings strings are immutable
# # returns index of the things found 0 based index returns -1 for things which don't exist
# name = "Tony Stark"
# grade = 'b'
# # # String operations
# # print(name.upper())
# # print(name.lower())
# # #find

# # print(name.find("k")) 
# # print(name.find("ark")) 
# # print(name.replace("Tony Stark", "I'm Ironman"))
# # #check for presence
# # # 'in' is a keyword
# # print('S' in name)
# # new operator in python / gives decimal and // gives only quotient int quotient ** is raised to the power
# # assignment operator += , -=, *=, /= means x = x + 5 --> x +=5
# #oprator precedence * / >> +- , is in same line left to right jayenge () has the highest precedence
# #comparision operator  > greater than eg print(3>2) will print True
# # > , < , >=, <= , == , !=
# #Logical operators 
# # or and not
# #or give true when either of statement is correct
# and when both expression is true
# not prints false when expression is true and vice versa
# stt1 = 20>3
# stt3 = 30>13
# print (not (stt1 and stt3))
#indentation here in python u use indentation instead of colans and curly brackets
# Logical opretors 
# range(start=0, stop, step=1)
#range(n) gives you a range of numbers from 0 to n-1
# for loops while loops
#loops => repeat
#break keyword just forces you out of loop while continue keyword just skips the part and goes to the next i like skips that particular i and jumps to the next i
# complex data types list tuple dictionary 
#list[] has length and is not limited to one type of data type
#marks[i] gives ith from start and marks[-i] gives ith from last
#slicing a list- list[st:end] ending index is exclusive not giving stopping index prints the values till the very end marks[:] print whole list cuz it uses default value if value is not specified
#marks.append(hehe) inserts hehe at the very end 
#marks.clear() clears the list
#tuple is immutBable list is muttable tuple() even exists without parenthesis
#marks.insert(index, hehe) inserts hehe at the specified index
#set => unique item collection uses {}
#Dictionary {key=>value}  key is written in double quotes val is assigned after colan and whole key value pair is seperated by comma "key":99, keys are unique and value can be same
#like struct in C
#funtion used for repeating same logic many times 
# def keyword is used to define a funtion and parameters are written in brackets 
#funtion oprations are written on next line after space
# # def sum(b): (here b is parameter ==> value defined in funtion)
#     print(b+b*.18)
# sum(100)  (100 is argument ==> value actually passed in funtion) arguments are stored in parameters and we can also return value from funt if we do nothing is printed when we call a funtion by default when nothing is retrned the value is printed when we call a funtion
# 3 types of funtns ==> user defined funt, inbuilt funt eg. print(), lenght(), min(), type(), , module funtion( these are the collections of relation funtn, classes, variable) eg maodule math
# import math
# print(dir(math)) ==> gives you all the funtns in module math
# from math import sqrt
# import random
# print(random.random()) #from [0,1) generates random value
# print(random.randint(10, 15)) #from [a, b] generates random value

# def Oddevv(a):
#  if(a%2==0):
#   print("even")
#  else:
#   print("odd") 
# Oddevv(56)  

def vowelc(a):
   b = a.lower()
   c = b.find("a", "e", "i")
   d = b.find("o", "u")
   return c+d
  

vo = "bfvhjbfvfbvfnvdfvdfnmdd"
print(vowelc(vo))