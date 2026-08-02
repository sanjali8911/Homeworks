import java.util.*;

public class pattern {
    public static void main(String [] args){
       try (Scanner sc = new Scanner(System.in)) {
        int n = sc.nextInt();
      for(int i =1; i<=n; i++) {
        //stars
        for(int j=1; j<=i; j++) {
          System.out.print("*");
         }//spaces 
         for(int j=1; j<=n-i; j++) {
          System.out.print("  ");
         } // next stars
         for(int j=1; j<=i; j++) {
          System.out.print("*");
         } 
          System.out.println();
      }
      // repeat 
      for(int i =n; i>=1; i--) {
        //stars
        for(int j=1; j<=i; j++) {
          System.out.print("*");
         }//spaces 
         for(int j=1; j<=n-i; j++) {
          System.out.print("  ");
         } // next stars
         for(int j=1; j<=i; j++) {
          System.out.print("*");
         } 
          System.out.println();
      }
    }
    }
}
