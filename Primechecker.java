import java.util.*;
public  class Primechecker {
    public static void main(String args[]) {
Scanner sc = new Scanner(System.in);
int n = sc.nextInt();
int count = 0;
for (int i=2; i<n; i++){
    if (n%i ==0) {
        count++; System.out.println("Factors include:" + i);
    }
    
} 
if (count>0) {
    System.out.println("Therefore given number is not prime ");
    System.out.println("number of factors: " + count);
} else{
    System.out.println("No factors other than 1 and itself therefore given number is prime");
}
    }
}