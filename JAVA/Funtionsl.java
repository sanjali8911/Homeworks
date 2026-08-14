import java.math.BigInteger;
import java.util.*;
public class Funtionsl {
// public static void printFac(int n) {
//     BigInteger Fac = BigInteger.ONE;
//     for (int i =n; i>=1; i--) {
//         Fac = Fac.multiply(BigInteger.valueOf(i));
//     } 
//     System.out.println(Fac);
// }
// public static void  main(String args[]){
//     Scanner sc = new Scanner(System.in);
//  int n = sc.nextInt();
//  System.out.print("The factorial of the given int is :");
//   printFac(n);
// }
public static long factorialme(int b) {
    long mumu = 1;
    for(int i=1; i<=b; i++) {
        mumu= mumu*i;
    }
    return mumu;
} 
public static void main(String args []) {
Scanner sc = new Scanner(System.in);
int a = sc.nextInt();
 System.out.print(factorialme(a));




}
}  

