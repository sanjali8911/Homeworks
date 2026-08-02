import java.math.BigInteger;
import java.util.*;

public class Factorials {
    public static void main(String[] args) {
     Scanner sc = new Scanner(System.in);
     int x = sc.nextInt();
     BigInteger xo = BigInteger.ONE;
      for(int i =1; i<x; i++) {
       xo = xo.multiply(BigInteger.valueOf(i));
      }
      System.out.println(xo);
    }
}