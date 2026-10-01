# Basic I/O, variables, type conversion
name = input("What's your name? ")
age = int(input("What's your age? "))
print(f"Hello {name}, you'll turn {age + 1} next year.")

# Conditional
if age >= 18:
    print("You're an adult.")
else:
    print("You're a minor.")

# Loop + list comprehension
squares = [x**2 for x in range(1, 6)]
print("Squares:", squares)

# Dictionary
person = {"name": name, "age": age}
print("Dict:", person)

# Function with default arg
def greet(name, greeting="Hey"):
    return f"{greeting}, {name}!"

print(greet(name))
print(greet(name, "Yo"))

# Simple class with a dunder method
class Student:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __str__(self):
        return f"Student({self.name}, {self.age})"

s = Student(name, age)
print(s)